import getopt, sys
import uno
import mimetypes
import subprocess
import re
from unohelper import Base, systemPathToFileUrl, absolutize
from os import getcwd
import os.path
import base64
import urllib
import tempfile
import shutil
from com.sun.star.beans import PropertyValue
from com.sun.star.uno import Exception as UnoException
from com.sun.star.io import IOException, XOutputStream
from lxml import etree
import zipfile


class OutputStream( Base, XOutputStream ):
    def __init__( self ):
        self.closed = 0
    def closeOutput(self):
        self.closed = 1
    def writeBytes( self, seq ):
        sys.stdout.write( seq.value )
    def flush( self ):
        pass

def removeFrames(root):
    ns = Namespaces()
    pTag = "{%s}p" % ns.get("text")
    drawTag = "{%s}frame" % ns.get("draw")
    bodyEls = "*/*/*" # % ns.get("office")
 
    for subEl in root.xpath(bodyEls):
	if subEl.tag == drawTag:
		subEl.getparent().remove(subEl)
	elif subEl.tag == pTag:
		return

def RemoveExtraImages(odfZip):
	#Nasty hack - remove draw frames before first P - this may kill some legit placed in frames
	#anchored to the doc, but when LibreOffice 3.5  saves .docx files to .odt it adds duplicate images
	#at the top of the doc
	
	contentXml = etree.parse(odfZip.open("content.xml"))
	contentRoot = contentXml.getroot()
	removeFrames(contentRoot)
		
	odfZip.writestr("content.xml",etree.tostring(contentRoot))

	
	
	

class Bookmarker():
    #
    def __init__(self, odfZip):
	self._count = 0
	self._ns = Namespaces()
	self.pTag = "{%s}p" % self._ns.get("text")
	self.hTag = "{%s}h" % self._ns.get("text")
	self._listTag = "{%s}list" % self._ns.get("text")
	self._styleNameAttributeName =  "{%s}style-name" % self._ns.get("text")
	self.bookmarkTag = "{%s}bookmark" % self._ns.get("text")
	self.bookmarkNameAttribute = "{%s}name" % self._ns.get("text")
	self.styles = Styles(odfZip)
	#Add bookmarks directly to content.xml with stylename and left margin
        contentXml = etree.parse(odfZip.open("content.xml"))
	#Exposing this for testing purposes
        self.contentRoot = contentXml.getroot()
	self._traverseDocAddingBookmarks(self.contentRoot)
	odfZip.writestr("content.xml",etree.tostring(self.contentRoot))
	odfZip.close()
	
    def _traverseDocAddingBookmarks(self, el, level = 0):
        for subEl in el.xpath("*"):
	   if subEl.tag in (self.pTag, self.hTag): #TODO - include headings in this
		style = subEl.get(self._styleNameAttributeName)

		#Add left margin info in bookmark
		bookmark = etree.Element(self.bookmarkTag)
		marginLeft = self.styles.getParaMarginLeft(style, level)
		#Remove units - all we need are absolute numbers
		#for relative indents
		marginLeft = re.sub("[^\W\d]*", "", str(marginLeft))
		bookmark.attrib[self.bookmarkNameAttribute] = "left-margin:%s :::%s" %\
			 (marginLeft, str(self._count))
		
		subEl.append(bookmark) 
		
		#Add style info in bookmark
		bookmark = etree.Element(self.bookmarkTag)
		bookmark.attrib[self.bookmarkNameAttribute] = "style:%s :::%s" %\
			 (self.styles.getDisplayName(style), str(self._count))
		self._count += 1
		subEl.append(bookmark) 
	   elif subEl.tag == self._listTag:
	   	self._traverseDocAddingBookmarks(subEl, level + 1)
	   else:
	 	self._traverseDocAddingBookmarks(subEl,level)					


  
	
class Namespaces:
    def __init__(self):
	self._ns = dict()
	self._ns["style"] = "urn:oasis:names:tc:opendocument:xmlns:style:1.0"
	self._ns["fo"] = "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
	self._ns["text"] = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
	self._ns["office"] = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"
        self._ns["draw"] = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"

    def get(self, ns):
	return self._ns[ns]

class Styles():	
    def __init__(self, odfZip):
	self.ns = Namespaces()
	self._styles = dict()
	self._readParaStyles(odfZip.open("styles.xml"))
	self._readParaStyles(odfZip.open("content.xml"), True)
	self._listStyles = dict()
	#Proper defined styles live in styles.xml
	self._readListStyles(odfZip.open("styles.xml"))
	#Auto defined styles live in content.xml
	self._readListStyles(odfZip.open("content.xml"))
	

    def _readParaStyles(self, styleFile, auto=False):
        self._stylesDoc = etree.parse(styleFile)
	styleElementName =  "{%s}style" % self.ns.get("style")
	styleNameAttributeName =  "{%s}name" % self.ns.get("style")
	styleParentAttributeName = "{%s}parent-style-name" % self.ns.get("style")
	styleParagraphPropertiesElementName = "{%s}paragraph-properties" % self.ns.get("style")
	marginAttributeName = "{%s}margin-left" % self.ns.get("fo")
	listStyleAttributeName = "{%s}list-style-name" % self.ns.get("style")
	displayNameAttributeName = "{%s}display-name" % self.ns.get("style")
	styleRoot = self._stylesDoc.getroot()
	for styleElement in styleRoot.iter(styleElementName):
		style = dict()
		style["auto"] = auto
		style["name"] = styleElement.get(styleNameAttributeName)
		style["parent"] = styleElement.get(styleParentAttributeName)
		style["list-style-name"] = styleElement.get(listStyleAttributeName)
		style["display-name"] = styleElement.get(displayNameAttributeName)
		style["margin-left"] = None
		for p in styleElement.iter(styleParagraphPropertiesElementName):
		    style["margin-left"] = p.get(marginAttributeName)
		
		self._styles[style["name"]] = style
	


    def _readListStyles(self, styleFile):
        self._listStylesDoc = etree.parse(styleFile)
	styleElementName =  "{%s}list-style" % self.ns.get("text")
	styleNameAttributeName =  "{%s}name"  % self.ns.get("style")
	listLevelAttributeName =  "{%s}level"  % self.ns.get("text")
	marginAttributeName = "{%s}margin-left"  % self.ns.get("fo")
	aligmentElementName =  "{%s}list-level-label-alignment"  % self.ns.get("style")
	
	
	styleRoot = self._listStylesDoc.getroot()
	for styleElement in styleRoot.iter(styleElementName):
		style = dict()
		style["name"] = styleElement.get(styleNameAttributeName)
		style["levels"] = dict()
		for l in styleElement.xpath("*"):
		    thisLevel = dict()
		    levelNum = l.get(listLevelAttributeName)
		    thisLevel["margin-left"] = None
		    for a in l.iter(aligmentElementName):
			thisLevel["margin-left"] = a.get(marginAttributeName)
		    style["levels"][levelNum] = thisLevel		
		self._listStyles[style["name"]] = style


    def getDisplayName(self, someStyle):
	if self._styles.has_key(someStyle):
		parent = self._styles[someStyle]["parent"]
		auto = self._styles[someStyle]["auto"]
		displayName = self._styles[someStyle]["display-name"]
		
		if not auto:
			if displayName <> None:
				return displayName
			else:
				return someStyle
		
		elif parent <> None and auto:
			return self.getDisplayName(parent)
	
	return "Default"

    def getListMarginLeft(self, someStyle, level):
	level = str(level)
	if self._listStyles.has_key(someStyle) and self._listStyles[someStyle]["levels"].has_key(level): #and self._listStyles[someStyle]["levels"][level].has_key("margin_left"):
		return self._listStyles[someStyle]["levels"][level]["margin-left"]
	else:
		return 0 #TODO Not sure if this is best
	
    def getParaMarginLeft(self, someStyle, level = 1):
	if self._styles.has_key(someStyle):
		margin = self._styles[someStyle]["margin-left"]
		parent = self._styles[someStyle]["parent"]
		liststyle = self._styles[someStyle]["list-style-name"]
		if  margin <> None:
			return margin
		elif liststyle <> None:
			return self.getListMarginLeft(liststyle, level)
		elif parent <> None:
			return self.getParaMarginLeft(parent)
	return "0"
		
   	 
    
	

def main():
    retVal = 0
    doc = None
    stdout = False

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hc:",
            ["help", "connection-string=" ,  "pdf", "noWordDown", "recursive", "daemon", "epub", "force"])
        wordDown = True #default to nice clean HTML
	dataURIs = False
	deleteOutputDir = False
	epub = False
	recursive = False
	force = False
	daemon = False
        for o, a in opts:
            if o in ("-h", "--help"):	
                usage()
                sys.exit()
           # if o == "--pdf":
           #     exportPDF = True #TODO
	    if o == "--noWordDown":
		wordDown = False
	    if o == "--dataURIs":
		dataURIs = True
	    if o == "--deleteOutputDir":
		deleteOutputDir = True
	    if o == "--epub":
		epub = True
	    if o == "--recursive":
		recursive = True
            if o == "--daemon":
		daemon = True
	    if o == "--force":
		force = True
                
        if not len(args) or len(args) > 2:
            usage()
            sys.exit()

	path = args[0]
	path = os.path.abspath(path)
	
        
	if len(args) == 2:
	    destDir = args[1]
	else:
	    destDir = None


	if recursive:
	    keepGoing = True
            while keepGoing:
		for root, dirs, files in os.walk(path):
		    for f in files:
		        filePath = os.path.join(root,f)
		        (stem, ext) = os.path.splitext(filePath)
		        if ext in (".doc",".odt",".docx"):	
		            if destDir <> None:
			        relpath = os.path.relpath(filePath, path)
			        dest = os.path.join(destDir, relpath)
			    else:
			        dest = os.path.join(root,"_html")
			    convert(filePath, dest, wordDown, dataURIs, epub, force)
            	keepGoing = daemon
	else:
	    if destDir <> None:
	         discardThis, outFilename = os.path.split(path)
	    else:
	        outPath = path 
                destDir, outFilename = os.path.split(path)
	        destDir = os.path.join(destDir,"_html")
            convert(path, destDir, wordDown, dataURIs, epub, force)
    except UnoException, e:
        sys.stderr.write( "Error ("+repr(e.__class__)+") :" + e.Message + "\n" )
        retVal = 1
    except getopt.GetoptError,e:
        sys.stderr.write( str(e) + "\n" )
        usage()
        retVal = 1
    sys.exit(retVal)

def convert(path, destDir, wordDown, dataURIs, epub, force):
	#todo - get rid of outFilename
        
        #todo - only run if there has been a change


        url = "uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext"

	if not os.path.exists(destDir):
	           os.makedirs(destDir)
	(tempVa, outFilename) = os.path.split(path)
	(filestem, ext) = os.path.splitext(outFilename)
	#Final HTML pathname

        
	dest = os.path.join(destDir, filestem + ".html")

	#Check up-to-dateness		
	if os.path.exists(dest) and  os.path.getmtime(dest) > os.path.getmtime(path) and not force:
		print "Unchanged"
		return
		
	tempDir = tempfile.mkdtemp()
        ctxLocal = uno.getComponentContext()
        smgrLocal = ctxLocal.ServiceManager

        resolver = smgrLocal.createInstanceWithContext(
                 "com.sun.star.bridge.UnoUrlResolver", ctxLocal)
        ctx = resolver.resolve(url)
        smgr = ctx.ServiceManager

        desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx )

        cwd = systemPathToFileUrl( getcwd() )

     
        inProps = PropertyValue( "Hidden" , 0 , True, 0 ),

        try:
		#Open initial document
		fileUrl = systemPathToFileUrl(path)
		doc = desktop.loadComponentFromURL( fileUrl , "_blank", 0, inProps )
		if not doc:
			raise UnoException( "Couldn't open stream for unknown reason", None )
 
		#obsolete & slow
		#lists = compileListInfo(doc) 
		#addBookmarks(doc, lists)
		
		#Write to temp and copy out later
 		
		tempOdtDest = os.path.join(tempDir, filestem + "_new.odt")
		
		destUrl = systemPathToFileUrl(tempOdtDest)
		
		#Save as ODT
		filterName = "writer8"
       		extension  = "odt"
		
      		outProps = (
           	   PropertyValue( "FilterName" , 0, filterName , 0 ),
	    	   PropertyValue( "Overwrite" , 0, True , 0 ),
           	   PropertyValue( "OutputStream", 0, OutputStream(), 0)
		)
		doc.storeToURL(destUrl, outProps)
		doc.close(True)
		

		#Pre-process the ODT file
		odt = zipfile.ZipFile(tempOdtDest, "a")
		RemoveExtraImages(odt)
		bookmarker = Bookmarker(odt)

		
		fileUrl = systemPathToFileUrl(tempOdtDest)
		doc = desktop.loadComponentFromURL( fileUrl , "_blank", 0, inProps )
		if not doc:
			raise UnoException( "Couldn't open stream for unknown reason", None )
	        



		#Save as HTML
		tempDest = os.path.join(tempDir, filestem + ".html")
		destUrl = systemPathToFileUrl(tempDest)
		filterName = "HTML (StarWriter)"
		#filtername = "writer_web_HTML_help"
       		extension  = "html"
      		outProps = (
           	   PropertyValue( "FilterName" , 0, filterName , 0 ),
	    	   PropertyValue( "Overwrite" , 0, True , 0 ),
           	   PropertyValue( "OutputStream", 0, OutputStream(), 0)
		)
		doc.storeToURL(destUrl, outProps)
		
		src_files = os.listdir(tempDir)
	        for file_name in src_files:
    			full_file_name = os.path.join(tempDir, file_name)
    			if (os.path.isfile(full_file_name) and full_file_name <> tempOdtDest):
    			    shutil.copy(full_file_name, destDir)

		if wordDown:
			myPath, myFile  = os.path.split(os.path.abspath(__file__))
			command = ["phantomjs",os.path.join(myPath, "render.js"), systemPathToFileUrl(dest), dest]
			subprocess.check_output(command)
		if epub:
			epubDest = os.path.join(destDir, filestem + ".epub")
			command = ["ebook-convert", dest, epubDest]
			subprocess.check_output(command)

		def getData(match):
			imgName = urllib.unquote(match.group(2))
			imgPath = os.path.join(destDir,imgName)
			imgData = base64.b64encode(open(imgPath).read())
			os.remove(imgPath)
			#TODO - proper mime type
			mime, encoding = mimetypes.guess_type(imgPath)
			return "%sdata:%s;base64,%s%s" % (match.group(1), mime, imgData, match.group(3))

		if dataURIs:
			html = open(dest, "r").read()
			html = re.sub('(<IMG.*?SRC=")(.*?)(".*?>)',getData, html,flags=re.IGNORECASE)
			open(dest, "w").write(html)
		print "Saved: " + dest

        except IOException, e:
      	  sys.stderr.write( "Error during conversion: " + e.Message + "\n" )
      	  retVal = 1
        except UnoException, e:
      	  sys.stderr.write( "Error ("+repr(e.__class__)+") during conversion:" + e.Message + "\n" )
      	  retVal = 1
        if doc:
      	  doc.dispose()

    
def usage():
    sys.stderr.write( "usage: WordDownOO.py --help | "+
                  "       [-c <connection-string> | --connection-string=<connection-string>\n"+
		  "       [--pdf]\n"+
		  "       [--noWordDown]\n"+
                  "       [--dataURIs]\n" + 
	          "       [--daemon]\n" + 
                  "       [--recursive]\n" 
                  "       [--force]\n" + 
                  "       inputFile [outputDir]\n"+
                  "\n" +
                  "Exports documents as HTML, and runs them through WordDown to clean them up\n" +
                  "Requires an OpenOffice.org instance to be running. The script and the\n"+
                  "running OpenOffice.org instance must be able to access the file with\n"+
                  "by the same system path. [ To have a listening OpenOffice.org instance, just run:\n"+
		  "openoffice \"-accept=socket,host=localhost,port=2002;urp;\" \n"
                  "\n"+
                  "-c <connection-string> | --connection-string=<connection-string>\n" +
                  "        The connection-string part of a uno url to where the\n" +
                  "        the script should connect to in order to do the conversion.\n" +
                  "        The strings defaults to socket,host=localhost,port=2002\n" +
                  "--noWordDown \n" +
                  "        Do not run WordDown javascript code\n" +
                  "--pdf \n" +
                  "        Export PDF as well as HTML (TODO)\n" +
		  " --dataURIs \n "+
                  "        Convert images to Data URIs embedded in the HTML" +
		  " --epub\n" + 
		  "	   Make an EPUB ebook (using Calibre ebook-convert)"
		  
                  )

if __name__ == "__main__":
    main()