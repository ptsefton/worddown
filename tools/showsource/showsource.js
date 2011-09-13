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

	   function zipall() {
		var zip = new JSZip();

		//TODO - 
		jQ(".toolbar").detach();
		fileName = document.location.href.replace(/.*\/(.*)$/, "$1");
		zip.add(fileName, jQ("html").html());
		//TODO - optionally add any other local files
		jQ("img").each( function () {
			data = getImageData(jQ(this));
			data = data.replace(/^data:image\/(png|jpg);base64,/, "");
		
			zip.add(src, data, {base64: true});
			tempCanvas = null;


		})
		//img = zip.folder("images");
		//img.add("smile.gif", imgData, {base64: true});
		content = zip.generate();
		location.href="data:application/zip;base64,"+content;
	   }

	  
  	

       function showMicrodata() {
		 var el = jQ(this).parents("*[itemscope]").first().clone();
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
	  	 var jsonText = jQ.microdata.json(el.parent().items(), function(o) { return JSON.stringify(o, undefined, 2); }); //
	  	 showCode(jsonText);
	}

	
	function seeData() {

		s = jQ("<span class='showMicrodata'>{&nbsp;}</span>");
		s.click(showMicrodata); 
		s.css({"color":"white","background-color":"blue"});
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
			if (jQ(this).filter("table, tr").length) {
				
				cell = jQ(this).find("td").first();
				if (cell.find("p").length){
					cell.find("p").first().prepend(seeData());
				}
				else {
					cell.prepend(seeData());
				}
			}
			else {
				jQ(this).prepend(seeData());
			}

			});
		
	}
      
	


 }

