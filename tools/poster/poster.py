# Posts an HTML document and any images to a wordpres blog using XMLRPC

#COPYRIGHT Peter Malcolm Sefton 2012
#    
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#    
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#    
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.






import xmlrpc.client, http.client, argparse, re, uuid, os.path, base64, codecs, urllib.parse
from getpass import getpass

from bs4 import BeautifulSoup



#Python docs are wrong on how to do this. Fix from here: http://www.python-forum.de/viewtopic.php?f=3&t=28245
class ProxiedTransport(xmlrpc.client.Transport):
    def set_proxy(self, proxy):
        self.proxy = proxy
    def make_connection(self, host):
        self.realhost = host
        h = http.client.HTTPConnection(self.proxy)
        #                   ^
        #                   |
        #             Need this instead of just HTTP
        return h
    def send_request(self, host, handler, request_body, verbose=False):
        connection = self.make_connection(host)
        connection.putrequest("POST", 'http://%s%s' % (self.realhost, handler))
        self.send_content(connection, request_body)
        return connection




class Poster:
	def __init__(self, blogUrl,username,password,proxy= None):

		self.blogUrl = blogUrl
		self.username = username
		self.password = password
		self.blogid = ''
		if proxy == None:
			self.server = xmlrpc.client.ServerProxy(self.blogUrl, allow_none=True)
		else:
			print("Setting proxy" + proxy)
			p = ProxiedTransport()
			p.set_proxy(proxy)
			self.server = xmlrpc.client.ServerProxy(self.blogUrl, allow_none=True, transport=p)
		
	
	def post(self,file, postType):
           
                f = open(file)
 
                html = f.read();
                (filePath,filename)= os.path.split(file)
                h = BeautifulSoup(html)
                
                #title = h.title.string
                title = ""
                srcs = dict()

	
                def findSrc(el,att):
                   for e in h.findAll(el):
                     if not(re.match("^https?://", e[att])):
                       srcs[e[att]] = e[att]

                def fixSrc(el,att):
                        for e in h.findAll(el):
                          if e[att] in srcs:
                            e[att] = srcs[e[att]]
                #TODO: deal with http images
                findSrc("img","src")
                findSrc("object","data")

                print(srcs)
                
                                
                for imgFile in srcs.keys():
                        data = {}
                        (tmp,ext) = os.path.splitext(imgFile)
                        imgFileName = urllib.parse.unquote(imgFile)
                        data['name'] = str(filename + "_" + imgFileName)
                        #Assume WP can work out the mimetype
                        data['type'] = 'image/jpeg'
                        data['overwrite'] = True 
                        contents = open(os.path.join(filePath,imgFileName),"rb").read()
                        
                        data['bits'] = xmlrpc.client.Binary(contents)
                        
                        wpImg = self.server.wp.uploadFile(self.blogid,self.username,self.password,data)
                        srcs[imgFile] = wpImg['url']
                        print("Uploaded an image")
                        print(wpImg)
                fixSrc("img","src")
                fixSrc("object","data")
                html = h.prettify()
                content = {}
                content['name'] = title
                print("TYPE:" +  postType)
                content['post_type'] = postType
                content['post_content'] = html
                content['post_title'] = title
                result = self.server.wp.newPost(self.blogid, self.username, self.password, content)
                print("Uploaded a page")
                print(result)



def main():
	parser = argparse.ArgumentParser(description='Post an HTML file to WordPress')
	parser.add_argument('url', metavar='url', type=str, 
					   help="URL for the blog's API (probably ending in /xmlrpc.php)")	
	parser.add_argument('username', metavar='username', type=str, 
					   help='Your username')
	#TODO - ask for this on the commandline instead
	parser.add_argument('--password', metavar='password', type=str,
					   help='Your password')
					   
	parser.add_argument('file', metavar='file', type=str,
					   help='HTML file to post')			
	parser.add_argument("--proxy", help="Proxy server and port eg 'proxy.uws.edu.au:3128'")	   
	parser.add_argument("--type", choices=("post","page"), help="Post-type, 'post' or 'page'", default='post')	   

	args = parser.parse_args()
	if args.password == None:
              password = getpass()
	else:
              password = args.password
             
	p = Poster(args.url, args.username, password, args.proxy)
	p.post(args.file, args.type
	)    
	
if __name__=="__main__":
	main()
