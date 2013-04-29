import WordDownOO
import zipfile
import tempfile, shutil, os
import unittest

class TestSequenceFunctions(unittest.TestCase):

    def setUp(self):
        self.testPath="./tests/testLeftAlign.odt"

    def getZip(self, filePath):
        tempFile = tempfile.TemporaryFile()
	tempPath = os.path.abspath(tempFile.name)
	shutil.copy(filePath,tempPath)
	return zipfile.ZipFile(tempPath)

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



if __name__ == '__main__':
    unittest.main()
