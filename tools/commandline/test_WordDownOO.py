import WordDownOO
import zipfile
import tempfile, shutil, os
import unittest
import re


class TestSequenceFunctions(unittest.TestCase):

    def setUp(self):
        self.testPath="./tests/testLeftAlign.odt"
	self.testPathDoc="./tests/TestWordDocLeftAlign.odt"

    def getZip(self, filePath):
        tempDir = tempfile.mkdtemp()
	shutil.copy(filePath,tempDir)
	p, filename = os.path.split(filePath)
	tempPath = os.path.join(tempDir, filename)
	return zipfile.ZipFile(tempPath, 'a')

    def test_styles(self):
	odt = self.getZip(self.testPath)
	s = WordDownOO.Styles(odt)
	self.assertEqual(s.getParaMarginLeft("Standard"),"0")
	self.assertEqual(s.getParaMarginLeft("P6"), "2.501cm")
	self.assertEqual(s.getParaMarginLeft("P3"), "1cm")
	self.assertEqual(s.getParaMarginLeft("P4"),"0cm")

	self.assertEqual(s.getParaMarginLeft("P5"), "1.27cm")
	self.assertEqual(s.getParaMarginLeft("P1"),"-1.251cm")

	self.assertEqual(s.getListMarginLeft("L1", 1), "1.296cm")

    def test_doc_styles(self):
	odt = self.getZip(self.testPathDoc)
	s = WordDownOO.Styles(odt)
	self.assertEqual(s.getParaMarginLeft("P2",1),"1.27cm")
	self.assertEqual(s.getParaMarginLeft("P2",2), "2.54cm")
	self.assertEqual(s.getParaMarginLeft("P1"), "1.27cm")

    def test_bookmarker(self):
	odt = self.getZip(self.testPathDoc)
	b = WordDownOO.Bookmarker(odt)
	margins = []
	
	for p in b.contentRoot.iter(b.pTag):
	  
            for bm in p.iter(b.bookmarkTag):
		bmText = bm.get(b.bookmarkNameAttribute)
		if re.search("left-margin:", bmText):
		    margin = re.sub("left-margin:","", bmText)
		    margin = re.sub("\s+:::.*","", margin)
		    margins.append(margin)
	expectedMargins = ["0","0","0","1.27","1.27","2.54","2.54","2.54","1.27","1.27","1.27","1.27","1.27","0","0"]
	self.assertEqual(expectedMargins, margins)

if __name__ == '__main__':
    unittest.main()
