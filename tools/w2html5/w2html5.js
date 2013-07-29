/*

COPYRIGHT Peter Malcolm Sefton 2011-2013

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.



*/

//TODO Refactor so that the Word to HTML and semantic parts are separate modules

_get = function(url, callback) {
   
  chrome.extension.sendRequest({action:'get',url:url}, callback);
}





function word2HML5Factory(jQ) {
    classNames = {};
    word2html = {};
    config = {};
    config.preFontMatch = /(courier)|(monospace)/i;
	//ICE convention is to hide styles begining with z in HTML
	//UKOLN use "Cover" for things we really only need in print
	//The idea of this config object is that you can configure for 
	//local use
	config.hideStyleMatch = /(Cover)|(^z)/;
	config.preStyleMatch = /(^pre)|(^code)/i;
	config.bibMatch = /MsoBibliography/i;
	config.headingMatches = [
		[/H(ead)?(ing)? ?1.*/i ,2],
		[/H(ead)?(ing)? ?2.*/i ,3],
		[/H(ead)?(ing)? ?3.*/i ,4],
		[/H(ead)?(ing)? ?4.*/i ,5],
		[/H(ead)?(ing)? ?5.*/i ,6],
		[/^(mso)?title/i, 1]
		
	]		
	
    


	function stateFactory(topLevelContainer, leastIndent) {
      	var state = {};
		state.indentStack = [leastIndent]; //indents in px
	 	state.elementStack = [topLevelContainer]; //elements
		state.headingLevelStack = [0]; //integers
		state.headingContainerStack = [topLevelContainer]; //elements
		state.headingLevel = 1;
		state.currentIndent = leastIndent;
		function setCurrentIndent(indent) {
			state.currentIndent = indent;
		}
		state.setCurrentIndent = setCurrentIndent;

		function setHeadinglevel(indent) {
			state.headingLevel = indent;
		}
		state.setHeadinglevel = setHeadinglevel;

		function nestingNeeded() {
			//Test whether current left=margin indent means we should add some nesting
			return(state.currentIndent > state.indentStack[state.indentStack.length-1]);
		
		}
		state.nestingNeeded = nestingNeeded;

		function headingNestingNeeded() {
			//Test whether current left-margin indent means we should add some nesting
			
			needed =state.headingLevel > state.headingLevelStack[state.headingLevelStack.length-1];
			
			return(needed);
		
		}
		state.headingNestingNeeded = headingNestingNeeded;


		function levelDown() {
			while (state.currentIndent < state.indentStack[state.indentStack.length-1]) {
				popState();
			}
			
		}
		state.levelDown = levelDown;

		function headingLevelDown() {
			
			while (state.headingLevel <= state.headingLevelStack[state.headingLevelStack.length-1]) {
				popHeadingState();
				
			}
			
			
		}
		state.headingLevelDown = headingLevelDown;

		function getCurrentContainer() {
			return state.elementStack[state.elementStack.length-1];
		}
		state.getCurrentContainer = getCurrentContainer;
		
		function getHeadingContainer() {
			return state.headingContainerStack[state.headingContainerStack.length-1];
		}
		state.getHeadingContainer = getHeadingContainer;
		
		function popState() {
			state.indentStack.pop();
			state.elementStack.pop();
		}
		state.popState = popState;

		function popHeadingState() {
		    if (state.headingLevelStack.length > 1) {
				state.headingLevelStack.pop();
				state.headingContainerStack.pop();
				
			}
			
	 		state.indentStack = [state.indentStack[0]];
			state.elementStack = [state.getHeadingContainer()];
		}
		state.popHeadingState = popHeadingState;


		function pushState(el) {
			 
			state.indentStack.push(state.currentIndent);
			state.elementStack.push(el);
		}
		state.pushState = pushState;


		function pushHeadingState(el) {
			head = state.headingLevel;
			state.headingLevelStack.push(head);
			state.getHeadingContainer().append(el);
			state.headingContainerStack.push(el);
			state.indentStack = [state.indentStack[0]];
			state.elementStack = [el];
		}
		state.pushHeadingState = pushHeadingState;

		
		return state;
}


	function loseWordMongrelMarkup(doc) {
			//Deal with MMDs        
                        
			//<!--[if supportFields]>
			//var IEdeclaration = /<\?.*?>/g;
			//doc = doc.replace(IEdeclaration, "");
			var endComment = /<\!(--)?\[endif]--*>/g;
			var endCommentReplace = "</span>";
			doc = doc.replace(endComment, endCommentReplace);


			var startComment = /<\!--\[(.*?)\](--)?>/g;
			startCommentReplace = "<span class='mso-conditional' data='$1'>";
			
			doc = doc.replace(startComment, startCommentReplace);

			//This is a rare special case, seems to be related to equations
			var wrapblock = /<o:wrapblock>/g;
			//wrapblockreplace = "<span title='wrapblock' ><!-- --></span>";
			doc = doc.replace(wrapblock, "");

			var endwrapblock = /<\/o:wrapblock>/g;
			//endwrapblockreplace = "<span title='end-wrapblock' ><!-- --></span>";
			doc = doc.replace(endwrapblock, "");
            // 
		    
			return doc;	

	}

	function getRidOfExplicitNumbering(element) {
		//Get rid of Word's redundant numbering (Note, don't don't do this on headings)
		jQ(element).find("span[style='mso-list:Ignore']").remove();
	
	}
	function getRidOfStyleAndClass(element) {
		jQ(element).removeAttr("style");
		//jQ(element).removeAttr("class");
	}

 function processparas(node) {
	  var container = jQ("<article></article>")	
   	 //container.append(node)
	 
	 reformatChunk(node, container);
	 
   	 container.find("td, th").each(function() {
		
		 reformatChunk(jQ(this), jQ(this));
	  });
	  
	node.prepend(container);
	return node;
	
 }
 function removeLineBreaks(text) {
		return text.replace(/(\r\n|\n|\r)/gm," ");
	  }
	
function addLineBreaks(text) {
		return text.replace(/(\r\n|\n|\r)/gm,"\\n");
	  }

 function getLeftMargin(el) {
		//Sets a data attribute with the left margin : data-margin-left

		//Don't do this if it has already been done
		if (!el.attr("data-margin-left")) {
			//Look for OpenOffice hack data
			var marginAnchor = el.find("a[name^='left-margin:']")
			if (marginAnchor.length) {
				marginString = marginAnchor.attr("name");
				marginString = marginString.replace("left-margin:","");
				marginString = marginString.replace(/:::.*/,"");
				marginAnchor.remove();
				el.attr("data-margin-left", marginString);
			} 
			else { //Not provided so use browser rendering
				el.attr("data-margin-left", parseFloat(el.offset().left));
			}
		}
	}

 function getClass(el) {
	//In Word docs the class will be there, in OpenOffice docs it has to be pre-processed
        //and stashed in a bookmark
	var classAnchor = el.find("a[name^='style:']")
	if (classAnchor.length) {
		classString = classAnchor.attr("name");
		classString = classString.replace("style:","");
		classString = classString.replace(/ :::.*/,"");
		classAnchor.remove();
		el.attr("class",classString);
	} 
	el.attr("data-class",  el.attr("class") ? String(el.attr("class")) : "");
	
	return  el.attr("data-class");
}

   function getType(el) {
		
		//Default to plain P
		el.attr("data-type", "p");


		var classs = getClass(el);
                //Look up the list we parsed out of CSS earlier
		if (classs in classNames) {
			classs = classNames[classs];
		}
		
		//Microformat for RDFa generation TOTO: test
		if (classs.search(/-(itemprop|property)$/) > -1) {
		    var prop = el.find("a").attr("href");
			el.find("a *:first").unwrap();
			el.attr("property",prop);
		}

		
		else if (classs.search(/-(itemprop|property)-/) > -1) {
		         
			el.attr("property",classs.replace(/.*-(itemprop|property)-/, ""));
		}
		else if (classs.match(config.hideStyleMatch)) {
			el.remove();
			return;
		}
		
		
		if ( classs.match(config.bibMatch)) {
				el.attr("data-type", "bib");
				return;
		}
		else if ( classs.match(config.preStyleMatch)) {
				el.attr("data-type", "pre");
				return;
		}

		//Headings using styles
		jQ.each(config.headingMatches,
		//Look for headings via paragraph style
			function (n, item) {
				if (classs.search(item[0]) > -1) {
					el.attr("data-type", "h");
					el.attr("data-headingLevel", item[1]);
					if (classs.search(/-/) > -1) {
						//Heading has extra style info following "-"
						el.attr("data-class", classs.replace(/.*?-/,""));
					}
					return;
					
				}
			}
		);

		//HTML headings
		var nodeName = el.get(0).nodeName;
		if (nodeName.search(/H\d/) == 0) {
			el.attr("data-type", "h");	
			if (!el.attr("data-headingLevel")) {
				el.attr("data-headingLevel", parseFloat(nodeName.substring(1,2)) + 1);
			}
			return;
		}
		
                
		
		
		style = el.attr("style");
		//TODO This will fail on adjacent lists (or other things) with same depth but diff formatting
		if ( style && (style.search(/mso-list/) > -1)) {
			var listType = 'b';
			el.attr("data-type","li");
			//Try to work out its type
	
			number = el.find("span[style='mso-list:Ignore']").text();
		
			if (number.search(/A/) > -1) {
				listType = "A";
			}
			else if (number.search(/1/) > -1) {
				listType = "1";
			}
			else if (number.search(/a/) > -1) {
				listType = "a";
			}
			else if (number.search(/I/) > -1) {
				listType = "I";
			}
			else if (number.search(/i/) > -1) {
				listType = "i";
			}
			
			
			el.attr("data-listType",listType);
			return;
			}
			
			//We have some paragraph formatting
			if (span = el.children("span:only-child")) {
			    
				fontFamily = span.css("font-family");
				//Word is not supplying the generic font-family for stuff in Courier so sniff it out
			   
				if (fontFamily && (fontFamily.search(config.preFontMatch) > -1)) {
					el.attr("data-type", "pre");
					
				}
			}
	
		
		
   }

function getBaselineIndentAndDataAtts(node) {
	//Find minimum left indent in a set of elements
	//To do this, also works out what type each paragraph is
	//So we end up with data attributes on all paragraphs/headings ready to reformat
	var leastIndent = 10000; //Silly large number
	
	node.children("p, h1, h2, h3, h4, h5").each(
		function (index) {
			getType(jQ(this));	
			getLeftMargin(jQ(this));		
	
			if (jQ(this).attr("data-margin-left") && (jQ(this).attr("data-type") != "h")  ) {
				var indent = parseFloat(jQ(this).attr("data-margin-left"));
				if (indent < leastIndent) {
					leastIndent = indent;
				}
			}
		}
	);
	flattenLists(node);
        return leastIndent;

   }
   function flattenLists(node) {
   //Word sometimes adds lists
   //OpenOffice always adds lists but their indenting and nesting is always wrong
   //So rip out all the lists and rebuild based on paragraph left margin,
   //wiki-markup style
   	labelListParas(node);
	unwrapLists(node);
   
  		
   }

   function unwrapLists(node) {
	  
	   while (node.children("ul, ol, li").length) {
	   	 node.children("ol").children("*").first().unwrap();
	  	 node.children("ul").children("*").first().unwrap();
	  	 node.children("li").children("*").first().unwrap();	
   	    }
   }
   function labelListParas(node) {
  	node.children("ul,ol").each(
		function() {
			var list = jQ(this);
			var listType;
			if (this.nodeName === "UL") {
				listType = "b";	
			}
			else {
				
				listType = jQ(this).attr("type") ? jQ(this).attr("type") : "1";
				
			}

			//Sometimes Word puts <p> in <li>, sometimes not
			//So normalise this to always have p
	 		list.find("li:not(:has(p))").each(function() {
				jQ(this).children().wrap("<p> </p>");

			});
			list.children("li").each(function(){
                               jQ(this).children("p").each(function ()
				{
					getClass(jQ(this));
					getLeftMargin(jQ(this));
					jQ(this).attr("data-listType",listType);
					jQ(this).attr("data-type","li");
				        labelListParas(jQ(this));
					
					
			        });
				labelListParas(jQ(this));
				
			});
			labelListParas(list);	
			
		});

}

   function removeTempDataAttributes(node) {
	node.removeAttr("data-headingLevel");
	node.removeAttr("data-listType");
	node.removeAttr("data-class");
	node.removeAttr("data-type");
	node.removeAttr("data-margin-left");
	}
   


   function reformatChunk(node, container) {

	var leastIndent = getBaselineIndentAndDataAtts(node);
	
	var state = stateFactory(container, leastIndent);

	//TODO Does this ever run????
	if (jQ(this).get(0).nodeName === 'TABLE') {
		state.getCurrentContainer().append(jQ(this));
		return;
	}
	

	//Main formatting code 
	
	node.children().each(function (index) {
		var type = jQ(this).attr("data-type");
		var margin = parseFloat(jQ(this).attr("data-margin-left"));
		var listType = jQ(this).attr("data-listType");
		var headingLevel = jQ(this).attr("data-headingLevel");
		var classs = jQ(this).attr("data-class") ? jQ(this).attr("data-class") :  "";
		jQ(this).removeAttr("align")	
		if (type === 'h') {
			
			if (jQ(this).parents("table").length) {
			   //TODO - Make this slide handling much more general-purpose
                           // Need a convention for making a one-cell table that is just there to create a section/slide etc 
			   if (classs == "Slide") {
					//Slide microformat
					var title = jQ(this).parents("table").first().attr("title");
					jQ(this).parents("table").first().attr("title","Slide: " + title);
				
				}
			}
		        else {
			   	state.setHeadinglevel(headingLevel);
				state.headingLevelDown(); //unindent container elements where necessary
			
			
			
				if (state.headingNestingNeeded()){        
					var newSection = jQ("<section></section>");
					if (classs.indexOf("typeof-") === 0) {
						newSection.attr("typeof",classs.replace(/^typeof-/,""));
					}
					else if (classs == "Slide") {
						newSection.attr("typeof", "http://purl.org/ontology/bibo/Slide");
					}
					state.pushHeadingState(newSection);
					}
				}
			
		}
		else { //Not a heading
				state.setCurrentIndent(margin);
		}
		
		//Get rid of formatting now
		getRidOfStyleAndClass(jQ(this));
		
		state.levelDown(); //If we're embedded too far, fix that
		//TODO fix nestingNeeded the check for 'h' is a hack
		if (type==="bib") {
			state.getCurrentContainer().append(jQ(this));
			if (!state.getCurrentContainer().filter("section[typeof='http://purl.org/orb/References']").length) {
				jQ(this).wrap("<section typeof='http://purl.org/orb/References'></section>");
				state.pushState(jQ(this).parent());
			}
		}
		else if (!(type === "h") && state.nestingNeeded()) {
			
			//Put this inside the previous para element - we're going deeper
			jQ(this).appendTo(state.getCurrentContainer());
			
			if (type == "li") {
				if (listType == "b") {
					jQ(this).wrap("<ul><li></li></ul>");
				}

				else {
					jQ(this).wrap("<ol type='" + listType + "'><li></li></ol>");
				}
				//TODO look at the number style and work out if we need to restart list numbering
				//The style info has a pointer to a list structure - if we see a new one restart the list
			
				getRidOfExplicitNumbering(jQ(this));
				state.pushState(jQ(this).parent());	
			
			}
			else if (type == "pre") {
				jQ(this).wrap("<pre></pre>");
				state.pushState(jQ(this).parent());
				jQ(this).replaceWith(removeLineBreaks(jQ(this).html()));
			}	
			else {
			
				jQ(this).wrap("<blockquote></blockquote>");
				state.pushState(jQ(this).parent());				 
			}
			//All subsequent paras at the right level and type should go into this para
			//So remember it
			
		}
		else {//Indenting not needed
			if (type == "li") {
			    //Hack - check if we're actually in a list - warning copied code below TODO
				if (!state.getCurrentContainer()) {
					if (listType == "b") {
					jQ(this).wrap("<ul><li></li></ul>");
					}

					else {
					    jQ(this).wrap("<ol type='" + listType + "'><li></li></ol>");
					}
					
				}
				else {
					jQ(this).appendTo(state.getCurrentContainer().parent());
					jQ(this).wrap("<li></li>");
				}
				getRidOfExplicitNumbering(jQ(this));
				state.pushState(jQ(this).parent());
			
			}
			else {
			    //Hack - the state-stack is a mess
				//if (state.getCurrentContainer().length) {
				jQ(this).appendTo(state.getCurrentContainer());
			    //}
				
				if (type == "h") {
					tag = "<h" + parseFloat(headingLevel) + " class=\"" + classs + "\">";
					jQ(this).replaceWith( tag + jQ(this).html());
					}
				
			


		
		if (type == "pre") {
					//TODO: Get rid of this repetition (but note you have to add jQ(this) to para b4 wrapping or it won't work)
					//console.log("PRE" + jQ(this).html());
					//jQ(this).appendTo(state.getCurrentContainer());
					if (jQ(this).parent("pre").length) {					    
						jQ(this).parent("").append("\n" + removeLineBreaks(jQ(this).html()));
						jQ(this).remove();
					}
					else {
						jQ(this).wrap("<pre></pre>");
						jQ(this).replaceWith(removeLineBreaks(jQ(this).html()));
					}
					
				}
				
			}	
			
			}
		removeTempDataAttributes(jQ(this));

		}
		

		)
	
	return node;
	}
        

	
   function removeTableFormatting(el) {
        el.wrap("<div></div>");
	var el2 = el.parent();
	el2.find("*[style]").removeAttr("style");
	//el2.find("*[border]").removeAttr("border");
	el2.find("*[cellspacing]").removeAttr("cellspacing");
	el2.find("*[cellpadding]").removeAttr("cellpadding");
	el2.find("*[width]").removeAttr("width");
	//el2.find("*[colspan]").removeAttr("colspan");
	el2.find("*[height]").removeAttr("height");
	el2.find("*[valign]").removeAttr("valign");
	el.unwrap();	
	el.removeAttr("class");
   }


  function removeMsoTableFormatting(el) {
        
    el.wrap("<div></div>");
	el2 = el.parent();
	el2.find("*[style]").each( function () {
		
                style = jQ(this).attr("style");
		
		style = style.replace(/mso-[\s\S]*(\;|$)?/g,"");
		if (style === "") {
			jQ(this).removeAttr("style");
		}
		else {
			jQ(this).attr("style",style);
		}
		
                
	});
	
	el.unwrap();	
	el.removeAttr("class");
   }

function removeEmpties(doc) {
	//Remove Empty paragraphs and 
	while (doc.find("p:empty, spans:empty").length) {
		doc.find("p:empty, spans:empty").remove();
	}
	//OpenOffice uses <p><br></p>
	doc.find("p:has(br)").not(doc.find("p:has(img)")).each(function(){
		if(/^\s+$/.test(jQ(this).text())) {
			jQ(this).remove();
		}
	});
	
}

function convert() {
    jQ("o\\:p, meta[name], object").remove();
	while (jQ("o:SmartTagType").length){ 
		jQ("o:SmartTagType *").first().unwrap();
	}
	//jQ("hr").parent().remove();

 	removeEmpties(jQ("body"));
	
	jQ("p[class^='MsoToc']").remove();
	
	//Extract the style info to make a lookup table for classes
	styleInfo = jQ("style").text();
	var re = /p\.([^,]*)[^{]*[{]mso-style-name:\s*(.+);/g;
	var match = re.exec(styleInfo);
	while (match != null) {
		// matched text: match[0]
		// match start: match.index
		classNames[match[1]] = match[2].replace(/\\/g,"").replace(/"/g,"");
		match = re.exec(styleInfo);
	}
	//Start by string-processing MSO markup into something we can read and reloading
	if (jQ("article").length) {
		return ; //Don't run twice
	}
	
	jQ("o\\:SmartTagType").each(function(){(jQ(this).replaceWith(jQ(this).html()))});
	
	jQ("head").html(loseWordMongrelMarkup(jQ("head").html()));

	jQ("body").html(loseWordMongrelMarkup(jQ("body").get(0).innerHTML));
   
	//Get rid of the worst of the embedded stuff from Word
	jQ("xml").remove();
	
	
	while (jQ("div").length) {
	    //console.log(jQ("div").html());
		jQ("div").each(function(i) {jQ(this).replaceWith(jQ(this).html() );});
	}
	

	
	processparas(jQ("body"));
	
	//Add Schema.org markup
	jQ("table[summary^='(itemprop|property)']").each(function() {
		prop = jQ(this).attr("summary");
		prop = prop.replace(/(itemprop|property)-/,"");
		jQ(this).attr("(itemprop|property)", prop);
		jQ(this).removeAttr("summary");
	});
	
        //TODO - generalise this to work with other vocabs - eg lists 
	jQ("table[title^='Slide:']").each(function() {
	   
		var paras = jQ(this).find("td, th").children();
		var slide = jQ("<section typeof='http://purl.org/ontology/bibo/Slide' >");
		jQ(this).replaceWith(slide);
		paras.appendTo(slide);
	});
	//Wordprocessor microformat - needs work.
	
	//TODO: Get rid of hard-wired vocab
	jQ("a[href^='http://schema.org/'], a[href^='http://purl.org/'] ").each(function() {
		var href = jQ(this).attr("href");
		
		typeProp = href.split("?");
		var container = jQ(this).parents("tr:not(:first-child),table,section,article,body").first();

		var vocab = "";
		// TODO match /purl.org/contology/w.*
		//else
		var parser = document.createElement('a');
		parser.href = href;
		vocab = parser.protocol + "//" + parser.host + "/"; 
		jQ(container).attr("vocab",vocab);  

		container.attr("typeof", typeProp[0]);

		if (typeProp.length > 1) {

			jQ(container).attr("property", typeProp[1].replace(/(itemprop|property)=/,""));

		}
		
		//container.attr("itemscope", "itemscope");
		jQ(this).replaceWith(jQ(this).html());
		
	});


        jQ("*[class^='(itemprop|propery)']").each(function() {
		prop = jQ(this).attr("class");
		var container = jQ(this);

		if (prop.search(/-(itemprop|property)$/) > -1) {
		    //Style is like class='p-propery' so
		    //The property is in an HREF in embedded link
			prop = jQ(this).find("a[href]").get(0).attr("href");
			jQ(this).find("a[href]").find("*:first").unwrap();
			
		}
		else {
			prop = prop.replace(/(itemprop|property)-/,"");
			inHeading = jQ(this).parent("h1,h2,h3,h4,h5");
			if  (inHeading.length) {
				//Itemprop on a heading means it applies 
				container = inHeading.get(0);
				jQ(this).find("*:first").unwrap();
			}
		}
		
		container.attr("property", prop);
		container.removeAttr("class");
	});
	
	//Clean it all up
	//jQ("span[style] *:first-child").unwrap();

        
	jQ("span[mso-spacerun]").replaceWith(" ");
	
	
	
        
	jQ("p[style], i[style], b[style]").each(function(){jQ(this).removeAttr("style");});
	
	jQ("v:shapetype, v:group").remove();
	
        //Sledgehammer approach to endnotes and footnotes
	jQ("a[style^='mso-endnote-id'], a[style^='mso-footnotenote-id']").each(function(){
		jQ(this).removeAttr("style");
		jQ(this).html("<sup>" + jQ(this).text()+ "</sup>");
	});
	

	//Clean up the body tag
	html = jQ("html");
 	html.removeAttr("xmlns");
	html.removeAttr("xmlns:v");
	html.removeAttr("xmlns:o");
	html.removeAttr("xmlns:w");
	html.removeAttr("xmlns:m");
        body = html.find("body");
	body.removeAttr("link");
	body.removeAttr("vlink");
	//jQ("head").html("");
	var headingTitle = jQ("h1.title");
	if (headingTitle.length > 0 ) {
		jQ("title").html(headingTitle.text());
	}
	jQ("head").append('<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />');

	//Clean up tables
	jQ("table").each( function() {
		summary = jQ(this).attr("summary");
		
		//Clumsy I know - fix this meandering
		if (summary && summary.match(/^noformat/)) {
			jQ(this).attr("summary", summary.replace(/^noformat/, ""));
                        if (jQ(this).attr("summary") === "") {
				jQ(this).removeAttr("summary");
			}
			removeTableFormatting(jQ(this));
		} else {
			removeMsoTableFormatting(jQ(this));
		}
	});
	
	jQ("style").remove();
	//TODO - probably want to lose this, was part of the HTML5 project	

	//Deal with hidden stuff, particularly embedded JSON from Zotero
	jQ("span[class='mso-conditional']").each(function() {
	    var contents = jQ(this).text();
		embeddedObjType  = jQ(this).attr("data");
		if (embeddedObjType === "if supportFields") {
			jQ(this).find("span[class='msoDel']").remove();
			
			
			var zoteroData = /ADDIN ZOTERO_ITEM CSL_CITATION/;
			function serialize(obj) {
				if (Object.prototype.toString.call(obj) === "[object String]") {

					return(obj);
				}
				else if (Object.prototype.toString.call(obj) === "[object Number]") {
				
					return obj.toString();
				}
				else if (obj instanceof Array) {
				
					returnString = "";
					jQ.each(obj, function(index,el) {
						
						returnString = returnString + serialize(el);
		
					});
					
					return returnString;
				}
				else {
				   
				    
					var resultString = "";
					jQ.each(obj, function(i,o) {
					
						if (Object.prototype.toString.call(o) === "[object String]")  {
				
							resultString = resultString +  "<meta property='" + i +"' content='" + o + "'/>";;
						}
						else {
						    var contents = serialize(o);
							
							if (contents.match(/^<.*>$/)) {
								resultString = resultString + "<span property='" + i + "'>" + contents + "</span>";
							}
							else {
								resultString = resultString + "<meta property='" + i +"' content='" + contents + "'/>";
							}
						}
					});
					return resultString;
					}
			
			}
		 			if (contents.match(zoteroData)) {
				
				var data = addLineBreaks(contents.replace(zoteroData, ""));
				data = data.replace(/(\\r\\n|\\n|\\r)/gm," ");
				//TODO: 

				citations = eval("(" + data + ")");
				citationMicrodata = jQ("");			
				
				var dataURI = "data:application/json,"  + escape(data);
				var citeRef = jQ("<link itemprop='url'></link>");
				var next = jQ(this).next();
				citeRef.attr("href",dataURI);
				jQ(this).replaceWith(citeRef);
				citeRef.wrap(jQ("<span property='cites' typeof='http://schema.org/ScholarlyArticle'></span>"));
				citeRef.parent().append(next);
				next.wrap("<span itemprop='label'></span>");
				jQ.each(citations.citationItems, function(itemNum, item) {
					mD = jQ("<span property='cites' typeof='http://schema.org/ScholarlyArticle'>XX:</span>");
					//mD.append(serialize(item.itemData));
					next.parent().after(mD);
					
					mD.get(0).innerHTML=serialize(item.itemData);
					mD.append("<link itemprop='uri' href='" + item["uri"] + "'/>");
					
					
				});
				
				
				
				 
				
			}
		}
		else if (embeddedObjType === "if !vml") {
			jQ(this).find("img").unwrap();
		}

		if (jQ(this).attr("data").match(/if \!supportFootnotes/)) {
			
			}	
		else {
			jQ(this).remove();
		}

	});
	//TODO make this configurable
	//jQ.find("span[lang^='EN']").each(function() {jQ(this).replaceWith(jQ(this).html())});
	//jQ.find("font").each(function() {jQ(this).replaceWith(jQ(this).html())});

	//TODO move to general cleanup function
	var unwantedSpans = "span[class='SpellE'], span[class='GramE'], span[style], span[data], font";
	while (jQ(unwantedSpans).length) {
		jQ(unwantedSpans).each(function(i) {jQ(this).replaceWith(jQ(this).html())});
	}

      
	 	
   }
   word2html.convert = convert;


   word2html.config = config;
  
   //tests
   word2html.removeEmpties = removeEmpties;
   word2html.getBaselineIndentAndDataAtts = getBaselineIndentAndDataAtts;
   word2html.getType = getType;
   word2html.getLeftMargin = getLeftMargin;
   word2html.processparas = processparas;
   word2html.flattenLists = flattenLists;
   return word2html;
}







