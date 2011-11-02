
 
 var showSource = function () {


	function removeUI(node) {
		node.find("#toolbar, .showSource, .showMicrodata").detach();
		node.find("body").removeAttr("style");
		
		node.find("*[class]").andSelf().each(function(){
			cleanClass = jQ(this).attr("class").replace(/ *show(source|data)-decoration/g, "");
			jQ(this).attr("class", cleanClass);
			if (jQ(this).attr("class") === "") {
				jQ(this).removeAttr("class");
			}
			});	
	
	  }

	//Doesn't work when run on local files
	function getImageData(img) {
			src = img.attr("src");
			width = img.attr("width");
			height = img.attr("height");
			tempCanvas = jQ("<canvas></canvas>");
			tempCanvas.attr("height", height);
			tempCanvas.attr("width", width);
			drawingContext = tempCanvas.get(0).getContext("2d");
		
			drawingContext.drawImage(img.get(0),0,0);
			//jQ(this).after(tempCanvas);
			var format;
			if (src.search(/.png$/)) {
				format = "image/png";
			} else {
				format = "image/jpeg";
			}
			var data = tempCanvas.get(0).toDataURL(format);
			return  data;

	   }


	
	  function getWithDataURIs(el, wrapper){
		elCopy = el.clone();
		
		
		removeUI(elCopy);
		
		wrapEl = jQ(wrapper);
               
	    //Copy all the attributes to a new element
		jQ.each(elCopy.get(0).attributes, function(i, att) {
			wrapEl.attr(att.name, att.value);
		});
		wrapEl.wrap("<div></div>")
		
		elCopy.find("img").each( function () { 
			data = getImageData(jQ(this));
			jQ(this).attr("src",data);
		})
		wrapEl.html(elCopy.get(0).innerHTML);
		return wrapEl.parent().get(0).innerHTML;
		}
		
	   //TODO: Get rid of this and fold all zipping into the epub code?
	   function addPageToZip(zip,page,fileName) {
	    pageString = page.clone().wrap("<div />").parent().xhtml();
		zip.add(fileName, pageString);
		//TODO - optionally add any other local files
		page.find("img").each( function () {
			data = getImageData(jQ(this));
			data = data.replace(/^data:image\/(png|jpg);base64,/, "");
		
			zip.add(src, data, {base64: true});
			tempCanvas = null;
		})
		return zip;
		}

	   function zipall() {
		var zip = new JSZip();
		var fileName = document.location.href.replace(/.*\/(.*)$/, "$1");
		jQ(".toolbar").detach();
        zip = addPageToZip(zip, jQ("html"), fileName);
		//TODO - 
		
		content = zip.generate();
		location.href="data:application/zip;base64,"+content;
	   }

	   function getJson(mD) {
		 var el = mD.parents("*[itemscope]").first().clone();
		 removeUI(el);
		 
		 //Need to make a top level item for the purposes of this data gathering
		 //http://www.whatwg.org/specs/web-apps/current-work/multipage/microdata.html#top-level-microdata-items
		 if (el.filter("[itemprop]").length) {
			el.wrap("<div></div>");
			
			el.parent().attr("itemscope", "itemscope");
			el.removeAttr("itemscope");
			el.parent().attr("itemtype",el.attr("itemtype"));
			el.removeAttr("itemtype");
			el = el.parent();
			
		 }
		 el.wrap("<div></div>");
		
		 return jQ.microdata.json(el.parent().items(), function(o) { return JSON.stringify(o, undefined, 2); }); 
	   }
  	

       function showMicrodata() {
		 var jsonText = getJson(jQ(this));
		 	
	
	  	
	  	 showCode(jsonText);
	}

	
	
  function epubFactory(jQ, rM) {
   var epub = {};
	//http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
	function S4() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		}
	function guid() {
			return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	}
		
   epub.guid = guid();
   
   var add = function(page, fileName, docTitle, order, navDoc) {
     
		var id = fileName.replace(".","_");
		
		
		
		page.find("img").each( function (index) {
		  
			data = getImageData(jQ(this));
			mimeType = data.replace(/^data:(.*?);.*/,"$1");
			data = data.replace(/^data:image\/(png|jpg);base64,/, "");
			 
			var src = jQ(this).attr("src");
			var ext = src.replace(/.*\./, ".");
			newName = fileName.replace(".html","_files/" + String(index) + ext);
			var itemm = jQ('<item>');
			
			itemm.attr("media-type", mimeType);
		    itemm.attr("id", id + "_image" + String(index));
		    itemm.attr("href",newName);
			 
			
		    epub.packageDoc.find("manifest").append(itemm);
			
			jQ(this).attr("src",newName);
			
			epub.zip.add(newName, data, {base64: true});
			tempCanvas = null;
		})
		
	
		pageString = page[0].outerHTML;
		
		
		
		epub.zip.add(fileName, pageString);
		

		//Build HTML TOC for EPUB 3
		epub.epubOl.append("<li><a href='" + fileName +  "'>" + docTitle + "</a></li>");
		
		//Add to Spine & navMap
		//Add to navMap
		
		var navPoint = jQ("<navPoint></navPoint>");
		var navLabel = jQ("<navLabel></navLabel>");
		navPoint.append(navLabel);
		navLabel.append(jQ("<text>" + docTitle + "</text>"));
		var content=jQ("<content>");
		content.attr("src", fileName);
		navPoint.append(content);
		navPoint.attr("id",id);
		navPoint.attr("playOrder", String(order));
		var itemRef = jQ("<itemref linear='yes'>");
		itemRef.attr("idref",id);
		if (navDoc) {
			epub.packageDoc.find("spine").prepend(itemRef);
			epub.ncx.find("navmap").prepend(navLabel.parent());
		} else {
			epub.packageDoc.find("spine").append(itemRef);
			epub.ncx.find("navmap").append(navLabel.parent());
		}
		
		
		//Add to Manifest
		var item = jQ('<item  media-type="application/xhtml+xml"/>');
		item.attr("id", id);
		item.attr("href",fileName);
		if (navDoc) {
			item.attr("properties","nav");
		}
		epub.packageDoc.find("manifest").append(item);
		
		}
	epub.add = add;
	
	var makePackage = function() {
		epub.packageDoc = jQ("<package>");
		epub.packageDoc.attr("xmlns", "http://www.idpf.org/2007/opf");
		epub.packageDoc.attr("version", "3.0");
		epub.packageDoc.attr("xml:lang", "en");
		epub.packageDoc.attr("unique-identifier", "pub-id");
	    epub.metadataEl = jQ("<metadata xmlns:dc='http://purl.org/dc/elements/1.1/'>");
		epub.packageDoc.append(epub.metadataEl);

		var idEl = jQ('<dc:identifier id="pub-id">');
		epub.metadataEl.append(idEl);
		
		idEl.html(epub.guid);
		
		//http://stackoverflow.com/questions/2573521/how-do-i-output-an-iso-8601-formatted-string-in-javascript
		function ISODateString(){
			var d = new Date();
			function pad(n){return n<10 ? '0'+n : n}
			return d.getUTCFullYear()+'-'
				+ pad(d.getUTCMonth()+1)+'-'
			  + pad(d.getUTCDate())+'T'
			  + pad(d.getUTCHours())+':'
			  + pad(d.getUTCMinutes())+':'
			  + pad(d.getUTCSeconds())+'Z'}

		
		var dateEl = jQ('<meta property="dcterms:modified"></meta>');
		dateEl.html(ISODateString());
		epub.metadataEl.append(dateEl);
		
		var titleEl = jQ('<dc:title>Untitled</dc:title>');
		epub.metadataEl.append(titleEl);
		
		//Bad, bad 'en'-centric ptsefton TODO fix this
		var lgEl = jQ('<dc:language>en</dc:language>');
		epub.metadataEl.append(lgEl);
        var manifest = jQ("<manifest></manifest>");
        epub.packageDoc.append(manifest);
		var ncxItem = jQ('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');
		manifest.append(ncxItem);
		
        epub.packageDoc.append(jQ("<spine  toc='ncx'></spine>"));
		console.log(epub.packageDoc);
		
		
		
	}
	epub.makePackage = makePackage;
	
	var makeEpubDoc = function() {
		var doc = jQ('<html></html>');
		doc.attr("xmlns", "http://www.w3.org/1999/xhtml");
		doc.attr("xmlns:epub", "http://www.idpf.org/2007/ops");
		var head = jQ("<head></head>");
		doc.append(head);
		doc.find("head").append(jQ("title")).append(jQ('<meta http-equiv="content-type" content="text/html; charset=utf-8"/>'));
		doc.append(jQ("<body></body>"));
		doc.find("body").append(jQ("<header><h1></h1></header>"));
		return doc;
	}
    epub.makeEpubDoc = makeEpubDoc;
	
	epub.xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>\n';

	epub.zip = new JSZip();
	
	epub.zip.add( "mimetype", "application/epub+zip");
	var metaInf = epub.xmlDeclaration + 
			'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">' +
			'<rootfiles>' +
			'<rootfile full-path="package.opf" media-type="application/oebps-package+xml"/>' +
			'</rootfiles></container>';
	epub.zip.add("META-INF/container.xml", metaInf);
	
	
	
	//TODO - populate this properly - write some functions
	epub.meta = {"title" : "Untitled", "author" : "anonymous"};
	//TODo - Create an old-style TOC document
	
	epub.nav = jQ("<nav epub:type='toc'> </nav>");
	epub.epubOl = jQ("<ol></ol>");
	epub.nav.append(epub.epubOl);
	
	epub.ncx = jQ('<ncx version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/ncx/">');
	var ncxHead = jQ("<head></head>");
	epub.ncx.append(ncxHead);
	
	ncxHead.append(jQ('<meta name="dtb:depth" content="1"/>'));
	ncxHead.append(jQ('<meta name="dtb:totalPageCount" content="0"/>'));
	ncxHead.append(jQ('<meta name="dtb:maxPageNumber" content="0"/>'));
	var metaId = jQ('<meta name="dtb:uid">')
	metaId.attr("content", epub.guid);
	ncxHead.append(metaId);
	epub.ncx.append(jQ("<docTitle><text>Untitled</text></docTitle>"));
	
	epub.ncx.append(jQ("<navMap></navMap>"));
	console.log(epub.ncx);
	//TODO look for metadata in the JSON 
	epub.makePackage();
	//Make a lookup table of file names - so we can munge links later
	epub.fileNames = {};
	jQ.each(rM["items"][0].properties["http://www.openarchives.org/ore/terms/aggregates"], function(index, item) {
		url  = item.properties.url[0];
		
		epub.fileNames[url] = "item" + String(index) + ".html";
	});
		 
	jQ.each(rM["items"][0].properties["http://www.openarchives.org/ore/terms/aggregates"], function(index, item) {
		url = item.properties.url[0];
		jQ.ajax({
			url: url,
			async: false,
			success: function(data){
					var htmlNode = makeEpubDoc();
					
					htmlNode.html(data);
					//Fix intra document links
					htmlNode.find("a[href]").each(function () {
						if (epub.fileNames[url]) {
							jQ(this).attr("href", epub.fileNames[url]);
						}
					});
					
					var pageTitle = (item.properties.name)?item.properties.name[0] : htmlNode.find("title").text();
					
					
					
					//TODO - filter down to part of the document
					var fileName = epub.fileNames[url];
					
					epub.add(htmlNode, fileName, pageTitle, (index + 1));
					
				}
			});
			
			
			});
		 
		
		epub.navDoc = makeEpubDoc();
		
		epub.navDoc.find("body").append(epub.nav);
		
		epub.add(epub.navDoc, "index.html", "Contents", 0, true);
		epub.zip.add("package.opf", epub.xmlDeclaration + epub.packageDoc.wrap("<div>").parent().xhtml());
		var ncx = epub.ncx.wrap("<div>").parent().xhtml();
		//Grrr  this is what you get for using jQuery to process XML :(
		ncx = ncx.replace(/<(\/?)navmap/g,"<$1navMap").replace(/<(\/?)navpoint/g,"<$1navPoint").replace(/<(\/?)navlabel/g,"<$1navLabel");
		ncx = ncx.replace(/<(\/?)docauthor/g,"<$1docAuthor").replace(/<(\/?)doctitle/g,"<$1docTitle");
		ncx = ncx.replace(/playorder=/g,"playOrder=")
		epub.zip.add("toc.ncx", epub.xmlDeclaration + ncx);
		
		var generate = function() {
			return epub.zip.generate();
		}
		epub.generate = generate;
	
		return epub;
  }
	
	function getEpub() {
		 var el = jQ(this).parents("*[itemscope]").first().clone();
		 var jsonText = getJson(jQ(this));
		 //Got a resource map
	    rM = eval("(" + jsonText + ")");
		
		var epub = epubFactory(jQ, rM);

		content = epub.generate();
		location.href="data:application/epub+zip;base64,"+content;
	}
	
	function seeData(resourceMap) {
		s = jQ("<span class='showMicrodata'>{&nbsp;}</span>");
		s.click(showMicrodata); 
		s.css({"color":"white","background-color":"blue"});
		if (resourceMap) {
			seeEpub();
		}
		return s;
	}

	function seeEpub() {
		s = jQ("<span class='getEpub'>[EPUB book]</span>");
		s.click(getEpub); 
		s.css({"color":"white","background-color":"green"});
		return s;
	}

	  function seeSource(container) {
		
		var nodeName = container.get(0).nodeName;
		var art = jQ("<span class='articleButton'>&lt;article> </span>");
		var sect =  jQ("<span class='sectionButton'>&lt;section></span>");
		var s = jQ("<div class='showSource'>" +  nodeName + ":: Show source as </div>");
		//Tried doing this in the css stylesheet but it didn't take in wordpress
		s.css({"color":"white","background-color":"red"});
		s.append(art);
		s.append(sect);
		
		art.click(articleButton);
	 	sect.click(sectionButton);
		return s;
		}

	  function seeTopToolbar() {

		var s = jQ("<div id='toolbar'><span id='button-zip'>Download as zip</span> </div>");
		s.css({"position":"fixed", "dispay" : "block", "top" : "0px", "width" : "100%", "background-color" : "red", "color":"white"});	

		s.find("#button-zip").click(zipall);
		return s;
		}

	 function unshowCode() {
		jQ("#sourceViewer, #hideSource").remove();
		}
	 function showCode(src) {
                 
         unshowCode();
	     viewer = jQ("<textarea></textarea>");
		 viewer.css({"background-color" : "white", "width" : "100%", "height" : "100%" });
		
		 
		 
                 var hideButton = jQ("<div id='hideSource'>[x] Close</div>");
		 
		 hideButton.click(unshowCode);
		 jQ("#toolbar").append(hideButton);
	   	 jQ("#toolbar").append(viewer);
		 viewer.wrap("<div  id='sourceViewer'></div>");
		 viewer.parent().css({"background-color" : "grey", "width" : "100%", "height" : "200px	", "padding" : "10px" });
		 viewer.get(0).innerHTML= src.replace(/&/g,"&amp;"); //jQuery .html() does not escape stuff properly
		 viewer.select();
 		}


	function articleButton() {
		showCode(getWithDataURIs(jQ(this).parents("section, article").first(), "<article></article>"));
	}

	function sectionButton() {
		showCode(getWithDataURIs(jQ(this).parents("section, article").first(), "<section></section>"));
	}
	 
	jQ = $; 
	var sourceButtons = jQ("#toolbar, .showMicrodata, .showSource"); 
		
	if (!sourceButtons.length) {
		jQ("body").prepend(seeTopToolbar());
		jQ("article, section").each(function(){
			//Decorate sections
			//jQ(this).wrap("<div class='showsource-decoration'></div>");
			
			//jQ(this).parent().css({"border": "1px dashed blue", "padding" : "2%"});
			if (jQ(this).attr("class") === undefined) {
				jQ(this).attr("class", "showsource-decoration");
			}
                        else {
				jQ(this).attr("class", jQ(this).attr("class") + " showsource-decoration");
			}
			jQ(this).prepend(seeSource(jQ(this)));
			
			});

		jQ("*[itemscope]").each(function(){
			if (jQ(this).attr("class")  === undefined) {
                      		 jQ(this).attr("class", "showdata-decoration");
			} else {
				 jQ(this).attr("class", jQ(this).attr("class") + " showdata-decoration");
			}
			var resourceMap = (jQ(this).attr("itemtype") === "http://www.openarchives.org/ore/terms/ResourceMap");
			
			if (jQ(this).filter("table, tr").length) {
				
				cell = jQ(this).find("td").first();
				if (cell.find("p").length){
					cell.find("p").first().prepend(seeData(resourceMap));
				}
				else {
					cell.prepend(seeData(resourceMap));
				}
			}
			else {
				jQ(this).prepend(seeData(resourceMap));
			}

			});
		
	}
      
	


 }

