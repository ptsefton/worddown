# WordDown helper classes for fixing and pre-processing open document format docs
import zipfile
from lxml import etree
import re

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
		
