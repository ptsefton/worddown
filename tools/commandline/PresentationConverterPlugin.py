#from yapsy.IPlugin import IPlugin
from categories import HTMLFormatter
import Present
import json 

class PresentationConverterPlugin(HTMLFormatter):
    """ OpenOffice/Libre office based slide presentation converter.
    

    """

    def initialize(self, logger, config):
        """ Create a new formatter for the dispatcher to use. """ 
        self.logger = logger
        self.config = config
        #TODO - need to Start openoffice
        #TODO get much more sophisticated with a daemon to keep it running
        #TODO Headless
        #subprocess.call(["soffice", 
        #                 "-accept=socket,host=localhost,port=2002;urp;"])
        self.actions = [{"exts"   :[".ppt",".pptx",".odp"],
                         "method" : self.convertPresentation,
                          "sig"   : "Pres",
                          "name"  : "OpenOffice based presentation converter"}]
        self.port = 2002
        
        #TODO - work out how to pass this in from __main__
        #if "preferDataURIs" in self.config:
        #    self.preferDataURIs = self.config["preferDataURIs"]
        #else:
        #    self.preferDataURIs = false
            
       
 

    def convertPresentation(self, actableFile):
        """Simple conversion script that runs WordDown
        Get WordDown from http://code.google.com/p/jischtml5/
        You need to have an OpenOffice variant installed, and 
        http://code.google.com/p/jischtml5/tools/commandline in your path
       
        """
        
        
        #For now this is calling python as process
        #TODO Need to turn WordDown into a module and fix this
        self.logger.info( "Running  Presentation converter  on " + actableFile.path)
        self.logger.info(Present.convert(actableFile.path, actableFile.indexHTML, actableFile.dirname))

    def print_name(self):
        print "Presentation Converter Plugin"

   


   
