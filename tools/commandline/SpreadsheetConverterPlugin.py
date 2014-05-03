#from yapsy.IPlugin import IPlugin
from categories import HTMLFormatter
import json 
import os, subprocess, shutil
class SpreadsheetConverterPlugin(HTMLFormatter):
    """ OpenOffice/Libre office based slide Spreadsheet converter.
    

    """

    def initialize(self, logger, config):
        self.logger = logger
        self.config = config
        """ Create a new formatter for the dispatcher to use. """ 
        self.actions = [{"exts"   :[".ods",".xls",".xlsx"],
                         "method" : self.convertSpreadsheet,
                          "sig"   : "Sheet",
                          "name"  : "OpenOffice based Spreadsheet converter"}]
  
        
       
 

    def convertSpreadsheet(self, actableFile):
        """Simple conversion script via unonconv
       
        """

        try:
            os.makedirs(actableFile.dirname)
        except:
            pass
        self.logger.info( "Running  Spreadsheet converter  on " + actableFile.path)
        command = ["unoconv","-v", "-f", "html", "-o",
                   actableFile.dirname, actableFile.path] 
       
	print command
	result = subprocess.call(command)
	open(actableFile.indexHTML, 'w').write(str(result))        
        self.logger.info(result)
        shutil.move(os.path.join(actableFile.dirname,actableFile.filestem + ".html"),
               actableFile.indexHTML)
        csv_command = ["unoconv","-v", "-f", "csvsheets", "-o",
                  actableFile.dirname, actableFile.path] 
        self.logger.info(subprocess.call(csv_command))
        
       
    def print_name(self):
        print "Spreadsheet Converter Plugin"

   


   
