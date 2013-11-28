#!/usr/bin/env python
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
from bs4 import BeautifulSoup
from com.sun.star.beans import PropertyValue
from com.sun.star.uno import Exception as UnoException
from com.sun.star.io import IOException, XOutputStream

import zipfile
from wordDownOpenOfficeUtils import Bookmarker
from wordDownOpenOfficeUtils import Styles
from wordDownOpenOfficeUtils import Namespaces

from lxml import etree

def convert(path, dest, wordDown, dataURIs, epub):
    url = "uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext"

    (destDir,outFilename) = os.path.split(dest)
    (filestem, ext) = os.path.splitext(outFilename)
      
  
    if not os.path.exists(destDir):
        os.makedirs(destDir)
   
                
    tempDir = tempfile.mkdtemp()
    ctxLocal = uno.getComponentContext()
    smgrLocal = ctxLocal.ServiceManager

    resolver = smgrLocal.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", ctxLocal)
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

        #Write an ODT copy  to temp and copy out later		
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
        tempDest = os.path.join(tempDir, outFilename)
        #else:
        #    tempDest = os.path.join(tempDir, filestem + ".html")
        
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
                if (os.path.isfile(full_file_name) and full_file_name <> tempOdtDest) and not file_name.startswith("~"):
                    shutil.copy(full_file_name, destDir)
        if wordDown:
                myPath, myFile  = os.path.split(os.path.abspath(__file__))
                command = ["phantomjs",os.path.join(myPath, "render.js"), systemPathToFileUrl(dest), dest]      
                subprocess.call(command)

       
        if epub:
                epubDest = os.path.join(destDir, filestem + ".epub")
                command = ["ebook-convert", dest, epubDest]
                subprocess.call(command)

        def getData(match):
                imgName = urllib.unquote(match.group(2))
                imgPath = os.path.join(destDir,imgName)
                imgData = base64.b64encode(open(imgPath).read())
                os.remove(imgPath)
                #TODO - proper mime type
                mime, encoding = mimetypes.guess_type(imgPath)
                return "%sdata:%s;base64,%s%s" % (match.group(1), mime, imgData, match.group(3))

        if dataURIs:
                try:
                    html = open(dest, "r").read()
                    html = re.sub('(<IMG.*?SRC=")(.*?)(".*?>)',getData, html,flags=re.IGNORECASE)
                    open(dest, "w").write(html)#.close()
                except:
                    print "Could not create Data URIS ",  sys.exc_info()[0]


        print "Saved: " + dest

    except IOException, e:
          sys.stderr.write( "Error during conversion: " + e.Message + "\n" )
          retVal = 1
    except UnoException, e:
          sys.stderr.write( "Error ("+repr(e.__class__)+") during conversion:" + e.Message + "\n" )
          retVal = 1
    if doc:
          doc.dispose()

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
    """ Remove all frames containing drawings before first p"""
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
    """Nasty hack to clean documents opened as docx and saved as odt
       openoffice adds extra images.
       
       TODO shift this to the javasscript part of the tool"""
       
    contentXml = etree.parse(odfZip.open("content.xml"))
    contentRoot = contentXml.getroot()
    removeFrames(contentRoot)
    odfZip.writestr("content.xml",etree.tostring(contentRoot))
    #odfZip.close()
		



    
def usage():
    sys.stderr.write( "usage: WordDownOO.py --help | "+
                  "       [-c <connection-string> | --connection-string=<connection-string>\n"+
		  "       [--pdf]\n"+
		  "       [--noWordDown]\n"+
                  "       [--dataURIs]\n" + 
	          
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

   	 
    
	

def main():
    retVal = 0
    doc = None
    stdout = False

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hc:",
                 ["help", "connection-string=" ,  "pdf", "noWordDown", "epub", "dataURIs"])
        wordDown = True #default to nice clean HTML
        dataURIs = False
        deleteOutputDir = False
        epub = False
  


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

       


        if not len(args) or len(args) > 2:
            usage()
            sys.exit()

        path = args[0]
        path = os.path.abspath(path)
        dir, outFilename = os.path.split(path)
        filestem, ext = os.path.splitext(outFilename)
        if len(args) == 2:
            destDir = args[1]
            dest = os.path.join(destDir, filestem + ".html")
        else:
            destDir = os.path.join(dir,"_html",outFilename)
            dest = os.path.join(destDir,"index.html")
        #Todo deal with destdir
        convert(path, dest, wordDown, dataURIs, epub)

    except UnoException, e:
                sys.stderr.write( "Error ("+repr(e.__class__)+") :" + e.Message + "\n" )
                retVal = 1
                
    except getopt.GetoptError,e:
                sys.stderr.write( str(e) + "\n" )
                usage()
                retVal = 1
                sys.exit(retVal)

def makeReadme(originalPath,title):
    readmeString = """
    <html><head>%(title)s;</head><body><a href="index.html">%(title)s</a></body></html>
    """
    readme = BeautifulSoup(readmeString)
    return readme.prettify()



if __name__ == "__main__":
    main()
