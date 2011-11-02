"""
Serves files out of its current directory.
Doesn't handle POST requests.

Derived from: http://www.blendedtechnologies.com/python-trick-really-little-http-server/220
"""

import http.server
from http.server import HTTPServer, BaseHTTPRequestHandler
import os.path
import os, win32com.client
from threading import Thread
from socketserver import ThreadingMixIn
import time
import sys



class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    #Thanks to this: http://stackoverflow.com/questions/60680/how-do-i-write-a-python-http-server-to-listen-on-multiple-ports
	pass

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        #Remove params from the request
        homeDir = os.getcwd()

        self.path = self.path.split('?')[0]
        
        [docDir,fileName] = os.path.split(self.path)
        [fileRoot,ext] = os.path.splitext(self.path)
       
      
        if ext =='.js' or ext=='.css':
                #TODO: Serve this properly not using this really bad #hack
                os.chdir(codeDir);
          
        if ext =='.doc' or ext =='.docx':
                path = docDir + fileRoot
                docPath = os.path.join(homeDir, self.path[1:])
                path = path[1:]
                docDir = os.path.dirname(docPath)

                htmlDir = docDir = os.path.join(docDir, "_html") 
                if (not(os.path.exists(htmlDir))):
                        os.mkdir(htmlDir)
                print("htmlDir " + htmlDir);
                htmlPath = os.path.join(htmlDir, fileName + ".htm")

           
                wdApp = win32com.client.gencache.EnsureDispatch('Word.Application')
                wdApp.Visible = 1
                doc = wdApp.Documents.Open(docPath)
               
                doc.SaveAs(htmlPath, win32com.client.constants.wdFormatHTML)
                if ext == '.doc':
                        fmt = win32com.client.constants.wdFormatDocument
                else:
                        fmt =  win32com.client.constants.wdFormatXMLDocument
                doc.SaveAs(docPath, fmt)
                html5Path = htmlPath + "5.htm"
                #Put conversion code into head
                f = open(htmlPath, 'r')
                html = f.read()
                f.close()
                html = html.replace("</head>", """
                        <script src='/tools/w2html5/jquery-1.6.4.js' type="text/javascript"> </script>
                        <script src='/tools/w2html5/w2html5.js' type='text/javascript'> </script>
                        <link rel='stylesheet' href='/tools/w2html5/w2html5.css'>
                        <link rel='stylesheet' href='/tools/w2html5/W3C-WD.css'>
                        
                        <script type='text/javascript'>
                                 $(document).ready(function() {
                                        converter = word2HML5Factory($);
                                        converter.convert();
                                        });
                                  
                        </script>
                        </head>""")
                f = open(html5Path, 'w')
                f.write(html)
                f.close()
                os.remove(htmlPath)
                #Experimental support for rendering using IE
                #ie = win32com.client.gencache.EnsureDispatch("InternetExplorer.Application")

                #ie.Visible = 1 #make this 0, if you want to hide IE window
                #IE started
                #ie.Navigate("http://localhost:8001/" + path + ".htm5.htm")
                #it takes a little while for page to load. sometimes takes 5 sec.
                
                self.path = html5Path.replace(homeDir,"").replace("\\","/")
                print("Final path" + self.path)
                self.send_response(301)
                self.send_header("Location", self.path)
                self.end_headers()
                
                

        http.server.SimpleHTTPRequestHandler.do_GET(self)
        os.chdir(homeDir)

def run(port, handler_class, path):
    server_class=HTTPServer
    server_address = ('', port)
    
    os.chdir(path)
    print ("Serving %s on port %s with scrips in %s" % (os.getcwd(), port, codeDir))
    httpd = server_class(server_address, handler_class)
    #TODO pass codeDir var instead of using global
    httpd.serve_forever()



runAt = sys.argv[1];
codeDir = os.getcwd();

run(8000, CustomHandler,  runAt)
