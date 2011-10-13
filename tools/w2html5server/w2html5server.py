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



class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    #Thanks to this: http://stackoverflow.com/questions/60680/how-do-i-write-a-python-http-server-to-listen-on-multiple-ports
    pass

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        [path, ext] = os.path.splitext(self.path)

        dir = os.getcwd()
        print(ext)
        if ext =='.js' or ext=='.css':
            #TODO: Serve this properly not using this really bad #hack
            os.chdir("C:\\Users\\pt\\Desktop\\jischtml5");
          
        if ext =='.doc':
           
            wdApp = win32com.client.gencache.EnsureDispatch('Word.Application')
            wdApp.Visible = 1
            doc = wdApp.Documents.Open(os.path.join(os.getcwd(), self.path[1:]))
            newPath = path + ".htm"
            htmlPath = os.path.join(os.getcwd(), newPath[1:])
            doc.SaveAs(htmlPath, win32com.client.constants.wdFormatHTML)
            doc.SaveAs(os.path.join(os.getcwd(), path[1:]), win32com.client.constants.wdFormatDocument)
            
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
            #Experimental support for rendering using IE
            #ie = win32com.client.gencache.EnsureDispatch("InternetExplorer.Application")
 
            #ie.Visible = 1 #make this 0, if you want to hide IE window
            #IE started
            #ie.Navigate("http://localhost:8001/" + path + ".htm5.htm")
            #it takes a little while for page to load. sometimes takes 5 sec.
            self.path = html5Path           
     
        http.server.SimpleHTTPRequestHandler.do_GET(self)
        os.chdir(dir)

def run(port, handler_class, path):
    server_class=HTTPServer
    server_address = ('', port)
    os.chdir(path)
    print ("Serving %s on port %s" % (os.getcwd(), port))
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()




run(8001, CustomHandler, "C:\\Users\\pt\\Dropbox")
