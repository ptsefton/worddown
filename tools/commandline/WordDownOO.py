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


class OutputStream( Base, XOutputStream ):
    def __init__( self ):
        self.closed = 0
    def closeOutput(self):
        self.closed = 1
    def writeBytes( self, seq ):
        sys.stdout.write( seq.value )
    def flush( self ):
        pass

def compileListInfo(doc):
	#Get list structures in an dict, with a properties dict for each list level
	#used to work out left margin on paragraphs that are inside list structures
	c =  doc.NumberingRules.Count
	lists = dict()
	for ruleNum in range(0,c):
		numberingRule = doc.NumberingRules.getByIndex(ruleNum)
		listId = numberingRule.DefaultListId
		lists[listId] = []
		for i in range(0,numberingRule.Count):
			lists[listId].append(dict())
		
			rule = numberingRule.getByIndex(i)
			for prop in rule:
				lists[listId][i][prop.Name] = prop.Value
	return lists
		
def addBookmarks(doc,lists):
	#Add bookmarks to all paras with left-margin and style info
	#because save as HTML does a terrible job with list embedding 
	#and does not export style information

  	curs = doc.Text.createTextCursor()
	hasNext = True;
        while hasNext:
                left = curs.ParaLeftMargin
                lid = curs.ListId
                if lid <> "":
                        level = curs.NumberingLevel
                        #print "Level %s" % str(level)
                        #print lid
                        left = lists[lid][level]["IndentAt"]
                #print "LeftMargin %s" % str(left)
                b1 = doc.createInstance("com.sun.star.text.Bookmark")
                b1.setName("left-margin:%s-" % str(left))

                doc.Text.insertTextContent(curs,b1,False)
                b2 = doc.createInstance("com.sun.star.text.Bookmark")
                b2.setName("style:%s :::" % curs.ParaStyleName)
                doc.Text.insertTextContent(curs,b2,False)    
		hasNext = curs.gotoNextParagraph(False)




class Styles():	
    def __init__(self, odfZip):
	self._styles = dict()
	self._readParaStyles(odfZip.open("styles.xml"))
	self._readParaStyles(odfZip.open("content.xml"))
	self._listStyles = dict()
	self._readListStyles(odfZip.open("styles.xml"))

    def _readParaStyles(self, styleFile):
        self._stylesDoc = etree.parse(styleFile)
	styleElementName =  "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}style"
	styleNameAttributeName =  "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}name"
	styleParentAttributeName = "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}parent-style-name"
	styleParagraphPropertiesElementName = "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}paragraph-properties"
	marginAttributeName = "{urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0}margin-left"
	styleRoot = self._stylesDoc.getroot()
	for styleElement in styleRoot.iter(styleElementName):
		style = dict()
		style["name"] = styleElement.get(styleNameAttributeName)
		style["parent"] = styleElement.get(styleParentAttributeName)
		style["margin-left"] = None
		for p in styleElement.iter(styleParagraphPropertiesElementName):
		    style["margin-left"] = p.get(marginAttributeName)
		
		self._styles[style["name"]] = style

    def _readListStyles(self, styleFile):
        self._listStylesDoc = etree.parse(styleFile)
	print "Reading list styles"
	styleElementName =  "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}list-style"
	styleNameAttributeName =  "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}name"
	listLevelAttributeName =  "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}level"
	marginAttributeName = "{urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0}margin-left"
	aligmentElementName =  "{urn:oasis:names:tc:opendocument:xmlns:style:1.0}list-level-label-alignment"
	marginAttributeName = "{urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0}margin-left"
	
	styleRoot = self._listStylesDoc.getroot()
	for styleElement in styleRoot.iter(styleElementName):
		style = dict()
		style["name"] = styleElement.get(styleNameAttributeName)
		style["levels"] = dict()
		for l in styleElement.xpath("*"):
		    thisLevel = dict()
		    levelNum = l.get(listLevelAttributeName)
		    print levelNum
		    for a in l.iter(aligmentElementName):
			thisLevel["margin-left"] = a.get(marginAttributeName)
		    style[levelNum] = thisLevel
		
		self._listStyles[style["name"]] = style


    def getListMarginLeft(self, someStyle, level):
	level = str(level)
	if self._listStyles.has_key(someStyle) and self._listStyles[someStyle].has_key(level):
		return self._listStyles[someStyle][level]["margin-left"]
	else:
		return 0 #TODO Not sure if this is best
	
    def getParaMarginLeft(self, someStyle):
	if self._styles.has_key(someStyle):
		margin = self._styles[someStyle]["margin-left"]
		parent = self._styles[someStyle]["parent"]
		if  margin <> None:
			return margin
		elif parent <> None:
			return self.getParaMarginLeft(parent)
		else:
			return "0"	
		
			
	else:
		return "0"
		
   	 
    
	

def main():
    retVal = 0
    doc = None
    stdout = False

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hc:",
            ["help", "connection-string=" ,  "pdf", "noWordDown", "dataURIs", "deleteOutputDir", "epub"])
        url = "uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext"
        wordDown = True #default to nice clean HTML
	dataURIs = False
	deleteOutputDir = False
	epub = False
        for o, a in opts:
            if o in ("-h", "--help"):	
                usage()
                sys.exit()
            if o in ("-c", "--connection-string"):
                url = "uno:" + a + ";urp;StarOffice.ComponentContext"
               
            if o == "--pdf":
                exportPDF = True

	    if o == "--noWordDown":
		wordDown = False
	    if o == "--dataURIs":
		dataURIs = True
	    if o == "--deleteOutputDir":
		deleteOutputDir = True
	    if o == "--epub":
		epub = True
                
        if not len(args) or len(args) > 2:
            usage()
            sys.exit()

	path = args[0]
	path = os.path.abspath(path)
        if len(args) == 2:
	    destDir = args[1]
	    if not os.path.exists(destDir):
		 os.makedirs(destDir)
	    discardThis, outFilename = os.path.split(path)
	else:
	    outPath = path
            destDir, outFilename = os.path.split(path)
	(filestem, ext) = os.path.splitext(outFilename)
	
	filterName = "HTML (StarWriter)"
        extension  = "html"
	
	#Final HTML pathname
	dest = os.path.join(destDir, filestem + "." + extension)
	
	tempDir = tempfile.mkdtemp()
        ctxLocal = uno.getComponentContext()
        smgrLocal = ctxLocal.ServiceManager

        resolver = smgrLocal.createInstanceWithContext(
                 "com.sun.star.bridge.UnoUrlResolver", ctxLocal)
        ctx = resolver.resolve(url)
        smgr = ctx.ServiceManager

        desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx )

        cwd = systemPathToFileUrl( getcwd() )

        outProps = (
            PropertyValue( "FilterName" , 0, filterName , 0 ),
	    PropertyValue( "Overwrite" , 0, True , 0 ),
            PropertyValue( "OutputStream", 0, OutputStream(), 0)
	)
	    
        inProps = PropertyValue( "Hidden" , 0 , True, 0 ),

        try:
		
		fileUrl = systemPathToFileUrl(path)
		doc = desktop.loadComponentFromURL( fileUrl , "_blank", 0, inProps )
		if not doc:
			raise UnoException( "Couldn't open stream for unknown reason", None )

		lists = compileListInfo(doc) 
		addBookmarks(doc, lists)


		
		#Write to temp and copy out later
                tempDest = os.path.join(tempDir, filestem + "." + extension)
		destUrl = systemPathToFileUrl(tempDest)
		sys.stderr.write(destUrl + "\n")
		#Save as HTML
		doc.storeToURL(destUrl, outProps)
		#Copy dir TODO
		
		src_files = os.listdir(tempDir)
	        for file_name in src_files:
    			full_file_name = os.path.join(tempDir, file_name)
    			if (os.path.isfile(full_file_name)):
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
			imgPath = os.path.join(destDir,match.group(2))
			imgData = base64.b64encode(open(imgPath).read())
			os.remove(imgPath)
			#TODO - proper mime type
			mime, encoding = mimetypes.guess_type(imgPath)
			return "%sdata:%s;base64,%s%s" % (match.group(1), mime, imgData, match.group(3))

		if dataURIs:
			html = open(dest, "r").read()
			html = re.sub('(<IMG.*?SRC=")(.*?)(".*?>)',getData, html,flags=re.IGNORECASE)
			open(dest, "w").write(html)


        except IOException, e:
      	  sys.stderr.write( "Error during conversion: " + e.Message + "\n" )
      	  retVal = 1
        except UnoException, e:
      	  sys.stderr.write( "Error ("+repr(e.__class__)+") during conversion:" + e.Message + "\n" )
      	  retVal = 1
        if doc:
      	  doc.dispose()
    except UnoException, e:
        sys.stderr.write( "Error ("+repr(e.__class__)+") :" + e.Message + "\n" )
        retVal = 1
    except getopt.GetoptError,e:
        sys.stderr.write( str(e) + "\n" )
        usage()
        retVal = 1
    sys.exit(retVal)
    
def usage():
    sys.stderr.write( "usage: WordDownOO.py --help | "+
                  "       [-c <connection-string> | --connection-string=<connection-string>\n"+
		  "       [--pdf]\n"+
		  "       [--noWordDown]\n"+
                  "       [--dataURIs]\n" + 
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

#main()    
