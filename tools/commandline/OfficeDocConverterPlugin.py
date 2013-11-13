#from yapsy.IPlugin import IPlugin
from categories import HTMLFormatter
import subprocess
import os
import WordDownOO

class PandocConverterPlugin(HTMLFormatter):
    """ OpenOffice/Libre office based document converter.
    

    """

    def __init__(self):
        """ Create a new formatter for the dispatcher to use. """ 
        print "Initialising Office doc plugin"
        #Start openoffice
        #TODO get much more sophisticated with a daemon to keep it running
        #TODO Headless
        #subprocess.call(["soffice", 
        #                 "-accept=socket,host=localhost,port=2002;urp;"])
        self.actions = [{"exts"   :[".doc", ".docx"],\
                         "method" : self.convertOffice,\
                          "sig"   : "WordDown",\
                          "name"  : "OpenOffice based markdown converter"}]
        self.port = 2002
        self. startup()

    def convertOffice(self, actableFile):
        """Simple conversion script that runs WordDown
        Get WordDown from http://code.google.com/p/jischtml5/
        You need to have an OpenOffice variant installed, and 
        http://code.google.com/p/jischtml5/tools/commandline in your path
        """
       
        #For now this is calling python as process
        #TODO Need to turn WordDown into a module and fix this
        print "Running  WordDown on " + actableFile.path
        WordDownOO.convert(actableFile.path, actableFile.dirname,
                           True, False, False, True, True)
        
        
    def print_name(self):
        print "WordDown Converter Plugin"

    def startup(self):
        """
        Start a headless instance of OpenOffice.
        From here: 
http://www.linuxjournal.com/content/starting-stopping-and-connecting-openoffice-python
        """
        args = ["soffice",
                '-accept=socket,host=localhost,port=%d;urp;StarOffice.ServiceManager' % self.port,
                '-norestore',
                '-nofirststartwizard',
                '-nologo',
                '-headless',
                ]
        
        try:
            pid = os.spawnve(os.P_NOWAIT, args[0], args, {})
        except Exception, e:
            raise Exception, "Failed to start OpenOffice on port %d: %s" % (self.port, e.message)

        if pid <= 0:
            raise Exception, "Failed to start OpenOffice on port %d" % self.port



   
