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

PORT = 8003
PORT2 = 8004

def move():
    """ sample function to be called via a URL"""
    return 'hi'

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    #Thanks to this: http://stackoverflow.com/questions/60680/how-do-i-write-a-python-http-server-to-listen-on-multiple-ports
    pass

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        [path, ext] = os.path.splitext(self.path)
        print(ext)
        if ext =='.doc':
            #This URL will trigger our sample function and send what it returns back to the browser
            wdApp = win32com.client.gencache.EnsureDispatch('Word.Application')
            wdApp.Visible = 1
            doc = wdApp.Documents.Open(os.path.join(os.getcwd(), self.path[1:]))
            newPath = path + ".htm"
            doc.SaveAs(os.path.join(os.getcwd(), newPath[1:]), win32com.client.constants.wdFormatHTML)
            doc.SaveAs(os.path.join(os.getcwd(), path[1:]), win32com.client.constants.wdFormatDocument)
            self.path = newPath
           
     
        http.server.SimpleHTTPRequestHandler.do_GET(self)



def run(port, handler_class=BaseHTTPRequestHandler):
    server_class=HTTPServer
    server_address = ('', port)
    print ("serving on port", port)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

Thread(target=run, args=[8010,http.server.SimpleHTTPRequestHandler]).start()

os.chdir("C:\\Users\\pt\\Dropbox")
run(8001, CustomHandler)
