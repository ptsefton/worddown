#from yapsy.IPlugin import IPlugin
from categories import HTMLFormatter
import json 
import os, subprocess
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
        self.logger.info( "Running  Spreadsheet converter  on " + actableFile.path)
        command = ["unoconv","-v", "-f", "html", "-o",
                   actableFile.indexHTML, actableFile.path] 
        print command
        self.logger.info(subprocess.call(command))

        csv_command = ["unoconv","-v", "-f", "csv", "-o",
                  actableFile.dirname, actableFile.filestem), actableFile.path] 
        self.logger.info(subprocess.call(csv_command))
       
       
    def print_name(self):
        print "Spreadsheet Converter Plugin"

   


   
