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






import xmlrpc.client, http.client, argparse, re, uuid, os.path, base64




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
			p = ProxiedTransport()
			p.set_proxy(proxy)
			self.server = xmlrpc.client.ServerProxy(self.blogUrl, allow_none=True, transport=p)
		
	
	def post(self,file):
		f = open(file)
		html = f.read();
		(filePath,filename)= os.path.split(file)
		#TODO post images first...
		
		#I know, regex to process HTML! but it's impossible to install
		# a sensible python3 XML/HTML library on OS X in less than a day
		
		#TODO - remove case sensitivity
		html = re.sub(".*<body>", "", html)
		html = re.sub("</body>.*", "", html)
		srcs = dict()
		srcMatch = re.compile(r"<img[^>]*src=(\"|')(.*?)\1")
		httpMatch = re.compile("https?:")
		#Find all the image src atts
		for m in srcMatch.finditer(html):
			src = m.group(2)
			if not httpMatch.match(src):
				srcs[src] = src
				
		for imgFile in srcs.keys():
			data = {}
			(tmp,ext) = os.path.splitext(imgFile)
			data['name'] = str(fileName + "_" +  imgFile) 
			#Assume WP can work out the mimetype
			data['type'] = 'image/jpeg'
			data['overwrite'] = True 
			contents = open(os.path.join(filePath,imgFile),"rb").read()
			
			data['bits'] = xmlrpc.client.Binary(contents)
			
			wpImg = self.server.wp.uploadFile(self.blogid,self.username,self.password,data)
			html = re.sub(r"(<img[^>]*src=)(\"|')%s(\2)" % imgFile, r"\1\2%s\3" % wpImg['url'], html) 
			print("Uploaded an image")
			print(wpImg)
		
		title = "Unititled"
		content = {}
		content['name'] = 'untitled'
		content['post_type'] = 'post'
		content['post_content'] = html
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
	parser.add_argument('password', metavar='password', type=str,
					   help='Your password')
					   
	parser.add_argument('file', metavar='file', type=str,
					   help='HTML file to post')			
	parser.add_argument("--proxy", help="Proxy server and port eg 'proxy.uws.edu.au:3128'")	   
	args = parser.parse_args()
	print(args.proxy)
	p = Poster(args.url, args.username, args.password, args.proxy)
	p.post(args.file)    
	
if __name__=="__main__":
	main()