#!/usr/bin/env python
"""
Converts office documents (.doc, odt etc) to HTML using LibreOffice save as HTML
which by default is agressively cleaned up to remove most direct formatting using
a javascript program, WordDown.

This script preprocesses documents to add some formatting information that Word Down uses
to make decisions about formatting.

This replaces WordDownOO which automated Open/Libre office using the uno library,
in a rather fragile way.

You need to have LibreOffice 4.2 or later installed, as this depends on
using the commandline conversion:

"soffice --contert-to"


"""
import getopt, sys
import mimetypes
import subprocess
import re

from os import getcwd
import os.path
import base64
import urllib
import tempfile
tempfile.tempdir = "/tmp"
import shutil
import os
import stat
from bs4 import BeautifulSoup


import zipfile
from wordDownOpenOfficeUtils import Bookmarker
from wordDownOpenOfficeUtils import Styles
from wordDownOpenOfficeUtils import Namespaces

from lxml import etree

def convert(path, dest, wordDown, dataURIs, epub):
 
    (destDir,outFilename) = os.path.split(dest)
    (filestem, ext) = os.path.splitext(outFilename)
    (fromDir,fromFile) = os.path.split(path)
    (fromStem, fromExt) = os.path.splitext(fromFile)
    if not os.path.exists(destDir):
        os.makedirs(destDir)
   
                
    tempDir = tempfile.mkdtemp()
    os.chmod(tempDir, 0o2770) #Sets group permissions and "sticky bit"
    
  
 
    fileUrl = path 
   
   
    #Write an ODT copy  to temp and copy out later		
    tempOdtDest = os.path.join(tempDir, filestem + ".odt")
    #Save as ODT
  
    command = ['soffice', '--headless', '--convert-to', 'odt', '--outdir', tempDir, fileUrl]
    subprocess.call(command, shell=False)
    if fromFile != filestem:
        shutil.move(os.path.join(tempDir,fromStem + ".odt"), tempOdtDest)


    odt = zipfile.ZipFile(tempOdtDest, "a")

    RemoveExtraImages(odt)
    bookmarker = Bookmarker(odt)


    fileUrl = tempOdtDest
    tempDest = os.path.join(tempDir, outFilename)
   
    destUrl = tempDest #systemPathToFileUrl(tempDest)
    command = ['soffice', '--headless', '--convert-to', 'html', '--outdir', tempDir, fileUrl]
    subprocess.call(command, shell=False)


    src_files = os.listdir(tempDir)
    for file_name in src_files:
            full_file_name = os.path.join(tempDir, file_name)
            if (os.path.isfile(full_file_name) and full_file_name <> tempOdtDest) and not file_name.startswith("~"):
                shutil.copy(full_file_name, destDir)
    if wordDown:
            myPath, myFile  = os.path.split(os.path.abspath(__file__))
            command = ["phantomjs",os.path.join(myPath, "render.js"), "file://" + dest, dest]
            print " ".join(command)
            subprocess.call(command, shell=False)

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
     
    #contentXml = etree.parse(odfZip.open("content.xml"))
    #contentRoot = contentXml.getroot()
    #removeFrames(contentRoot)
    #odfZip.writestr("content.xml",etree.tostring(contentRoot))
    #odfZip.close()
		



    
def usage():
    sys.stderr.write( "usage: word2html.py --help | "+
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

    opts, args = getopt.getopt(sys.argv[1:], "hc:",
             ["help", "pdf", "noWordDown", "epub", "dataURIs"])
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


def makeReadme(originalPath,title):
    readmeString = """
    <html><head>%(title)s;</head><body><a href="index.html">%(title)s</a></body></html>
    """
    readme = BeautifulSoup(readmeString)
    return readme.prettify()



if __name__ == "__main__":
    main()
