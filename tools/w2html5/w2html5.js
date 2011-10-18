/*

COPYRIGHT Peter Malcolm Sefton 2011

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

//TODO - capture everything after "-" in a style name and use a class on generated p or h


_get = function(url, callback) {
   
  chrome.extension.sendRequest({action:'get',url:url}, callback);
}





function word2HML5Factory(jQ) {
    classNames = {};
	word2html = {};
	config = {};
    config.preMatch = /(courier)|(monospace)/i;
	config.bibMatch = /MsoBibliography/i;
	config.headingMatches = [
		[/H(ead)?(ing)? ?1.*/i ,2],
		[/H(ead)?(ing)? ?2.*/i ,3],
		[/H(ead)?(ing)? ?3.*/i ,4],
		[/H(ead)?(ing)? ?4.*/i ,5],
		[/title/i, 1],
		[/subtitle/i,  2]
		
	]		
	
        function hackFixProperty(prop) {
		//Need to look up class names against mso-style names to fix this
		var fixes = {
			"addresslocality" : "addressLocality",
			"addressregion"   : "addressRegion",
			"jobtitle"        : "jobTitle",
			"startdate"       : "startDate",
			"enddate" 	  : "endDate",
			"postalcode"	  : "postalCode"
		}
                
		return prop in fixes ? fixes[prop] : prop;
	}


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
				console.log(state.headingContainerStack);
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
		jQ(element).removeAttr("class");
	}
   	function processparas() {

	  //Always wrap carefully
	  var container = jQ("<article itemscope='itemscope' itemtype='http://schema.org/ScholarlyArticle'></article>")	   
	  processpara(jQ("body > *"), container);
      //TODO: get rid of this div
	  jQ("td, th").each(function() {
		 processpara(jQ(this).find("*"), jQ('this'));
	  });
	
        }

  function removeLineBreaks(text) {
	return text.replace(/(\r\n|\n|\r)/gm," ");
  }

  function addLineBreaks(text) {
	return text.replace(/(\r\n|\n|\r)/gm,"\\n");
  }

   function getType(el) {
		
		el.attr("data-type", "p");
		classs =  String(el.attr("class"));
		if (classs in classNames) {
			classs = classNames[classs];
		}
		el.attr("data-class", classs);
		if (classs.search(/-itemprop$/) > -1) {
		    var prop = el.find("a").attr("href");
			el.find("a *:first").unwrap();
			el.attr("itemprop",prop);
		}
		else if (classs.search(/-itemprop-/) > -1) {
		   
			el.attr("itemprop",classs.replace(/.*-itemprop-/, ""));
		}
		if ( classs.match(config.bibMatch)) {
				el.attr("data-type", "bib");
				return;
		}
		//HTML headings
		var nodeName = el.get(0).nodeName;
		if (nodeName.search(/H\d/) == 0) {
			el.attr("data-type", "h");
			el.attr("data-headingLevel", parseFloat(nodeName.substring(1,2)) + 1);
			return;
		}
		
        //Headings using styles
		jQ.each(config.headingMatches,
		//Look for headings via paragraph style
			function (n, item) {
				if (classs.search(item[0]) > -1) {
					el.attr("data-type", "h");
					el.attr("data-headingLevel", item[1]);
					return;
					
				}
			}
		);
		
		style = el.attr("style");
		//TODO This will fail on adjacent lists (or other things) with same depth but diff formatting
		if ( style && (style.search(/mso-list/) > -1)) {
			
			el.attr("data-type","li");
			//Try to work out its type
	
			number = el.find("span[style='mso-list:Ignore']").text();
			if (number.search(/A/) > -1) {
				listType = "A";
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
			else {
				listType = "b"; //Default to bullet lists
			}
				
			el.attr("data-listType",listType);
			return;
			}
			
			//We have some paragraph formatting
			if (span = el.children("span:only-child")) {
				fontFamily = span.css("font-family");
				//Word is not supplying the generic font-family for stuff in Courier so sniff it out

				if (fontFamily && (fontFamily.search(config.preMatch) > -1)) {
					type = "pre";
				}
			}

		
		
   }
   
   function processpara(nodeList, container) {
	//Table? Add it and get out - process later
	if (jQ(this).get(0).nodeName === 'TABLE') {
		state.getCurrentContainer().append(jQ(this));
		return;
	}
	  //Get baseline indent
	var leastIndent = 10000;

	nodeList.filter("p, h1, h2, h3, h4, h5").each(
		function (index) {			
			getType(jQ(this));
	
			
			if (jQ(this).attr("data-type") == "p") {
				indent = parseFloat(jQ(this).css("margin-left"));
				if (indent < leastIndent) {
					leastIndent = indent;
				}
			}
		}

	);
	  
	var state = stateFactory(container, leastIndent);
	nodeList.each(function (index) {
	
		

	type = jQ(this).attr("data-type");
	jQ(this).removeAttr("data-type")
	headingLevel = jQ(this).attr("data-headingLevel");
	jQ(this).removeAttr("data-headingLevel");
	jQ(this).removeAttr("data-listType");

	if (index == 0)  {
		//When in tables currentContainer is not defined so this is harmless
		//Still, this is probably quite shonky code
		jQ("body").prepend(state.getCurrentContainer());       
	}	
		
	if (type === 'h') {
		state.setHeadinglevel(headingLevel);
		state.headingLevelDown(); //unindent where necessary
		if (state.headingNestingNeeded()){        
			state.pushHeadingState(jQ("<section></section>"));		
			}
		}
		else {
			var margin = parseFloat(jQ(this).css("margin-left"));
			state.setCurrentIndent(margin);
		}

		
		
	
	    
	  
	 

		
		

	//Get rid of formatting now
	getRidOfStyleAndClass(jQ(this));



	state.levelDown(); //If we're embedded too far, fix that
		//TODO fix nestingNeeded the check for 'h' is a hack
	if (type==="bib") {
		state.getCurrentContainer().append(jQ(this));
		if (!state.getCurrentContainer().filter("section[class='bibliography']").length) {
			jQ(this).wrap("<section class='bibliography'></section>");
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
		
		
		}
		else if (type == "pre") {
			jQ(this).wrap("<pre></pre>");
			//TODO: fix unwanted line breaks
			jQ(this).replaceWith(removeLineBreaks(jQ(this).html()));
		}	
		else {
			 jQ(this).wrap("<blockquote></blockquote>");	 
		}
		//All subsequent paras at the right level and type should go into this para
		//So remember it
		state.pushState(jQ(this).parent());
	}
	else {
		if (type == "li") {
			jQ(this).appendTo(state.getCurrentContainer().parent());
			jQ(this).wrap("<li></li>");

			getRidOfExplicitNumbering(jQ(this));
			state.pushState(jQ(this).parent());
		
		}
		else {
			jQ(this).appendTo(state.getCurrentContainer());
			if (type == "h") {
				tag = "<h" + parseFloat(headingLevel) + ">";
				jQ(this).replaceWith( tag + jQ(this).html());
			}


			
			else if (type == "pre") {
				//TODO: Get rid of this repetition (but note you have to add jQ(this) to para b4 wrapping or it won't work)
				if (jQ(this).prev("pre").length) {
					jQ(this).prev().append("\n" + removeLineBreaks(jQ(this).html()));
					jQ(this).remove();
				}
				else {
					jQ(this).wrap("<pre></pre>");
					jQ(this).replaceWith(removeLineBreaks(jQ(this).html()));
				}
				
			}
		}	
		
		}

	}
	  

	)
	}
        
    /*
    Some experiments in document structure editing - may revive these at some stage

  
    function h1(){     
	//TODO - split
	headingify("h1",jQ(this));
     }
    function h2(){     
	//TODO - split
	headingify("h2",jQ(this));
     }
    function h3(){     
	//TODO - split
	headingify("h3",jQ(this));
     }	
     function h4(){     
	//TODO - split
	headingify("h4",jQ(this));
     }
     function h5(){     
	//TODO - split
	headingify("h5",jQ(this));
     }	
   function headingify(tag,element){     
  
	host = jQ(getpara(element));
	splitStructure(host, tag);
	
	host.wrap("<x></x>".replace(/x/,tag));
      
	host.parent().html(host.html()	);
			
        makeEditable();
     }

    function paragraphify(){     
	//TODO - work out our heading level
	host = jQ(this).parents("h1,h2,h3,h4,h5");
	host.wrap("<p></p>");
	
	host.parent().html(host.html());
	makeEditable();
     }

    function getHeadingLevel(element){
	tag = element.get(0).nodeName;
	return parseFloat(tag.substring(1,2));
    }
    
    function getpara(element) {
	
	return element.parents("h1,h2,h3,h4,h5,p").first();	
    }

    function detachToolbar(){
	jQ(".toolbar").detach();
 	makeEditable();
    }

    function headingPromote(){     
	host = getpara(jQ(this));
	level = getHeadingLevel(host);
        
	if (level > 1) {
                host.wrap("<hx></hx>".replace(/x/,String(level-1)));
		
		host.parent().html(host.html());
		
	}
        makeEditable();
     }
     
     function toHtml(element) {
	return element.clone().wrap("<div></div>").parent().html();

     }
     function splitStructure(element) {
         
	//Make two copies of the parent and recurse until we hit the top level
        //alert(element.parent("article,body").html());
        //element = element.parent(); //Get me the LI
        //alert(element.get(0).nodeName + " < " + element.parent().get(0).nodeName);
	element.find(".toolbar").detach();
        if (element.parent().filter("article,body").length == 0) {
		
               if (element.next("ul,ol,blockquote").length	) {
			
		splitStructure(element.next());
		}	
		
	        var par = element.parent();
           
		var before = par.clone();
		
		before.empty();
		var after = before.clone();
		//Prev all in reverse doc order
		element.prevAll().each(function() {
			before.prepend(jQ(this));
		});
		

		after.append(element.nextAll());
		
		
		par.replaceWith(element);	
		if (before.children().length) {
			element.before(before);
		}
		if (after.children().length) {
			element.after(after);
		}
		
	
		splitStructure(element);
			
	 }
	
	 

	}
 

    function headingDemote(){     
	host = getpara(jQ(this));
	level = getHeadingLevel(host);
        
	if (level < 5) {
                host.wrap("<hx></hx>".replace(/x/,String(level+1)));
		host.parent().html(host.html());
		
	}
        makeEditable();
     }
      
   function toolbarFactory(toolbarClass) { 
	var toolbar = jQ("<span class='" + toolbarClass + "'></span>");
	 	function addButton(title, text) {
			
			
                        if (title) {
				button = jQ("<span class='button' id='" + title + "'> " + text + " </span>");
				
			} else {
				button = jQ("<span class='button'> " + text + " </span>");
			}
			toolbar.append(button);
			toolbar.find("#"+title).click(eval(title));
			
		};
   		
        	toolbar.addButton = addButton;
     		return toolbar;
	};
   function promote() {
        para = getpara(jQ(this));
        
	detachToolbar();
   }
  
 

   function populateToolbar() {
 	toolbar = toolbarFactory("toolbar");
	jQ(".toolbar").remove();
	
	jQ(this).prepend(toolbar);
	
	
	toolbar.addButton("paragraphify","P");
	toolbar.addButton("h1", "Heading 1");
	toolbar.addButton("h2", "Heading 2");
	toolbar.addButton("h3", "Heading 3");
	toolbar.addButton("h4", "Heading 4");
	toolbar.addButton("h5", "Heading 5");
	toolbar.addButton("more", "More options");
	toolbar.addButton("x", "[x] Close");
	
      

      // jQ("h1,h2,h3,h4,h5,p").hover( function () {jQ(this).prepend(headingLevelButtons);})


   }

  */

	
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

   function convert() {
    jQ("o\\:p, meta, object").remove();
	jQ("hr").parent().remove();
	while (jQ("p:empty, span:empty").length) {
		jQ("p:empty, span:empty").remove();
	}
	
	jQ("p[class^='MsoToc']").remove();
	
	//Extract the style info to make a lookup table for classes
	styleInfo = jQ("style").text();
	var re = /p\.(\w+)[^{]*[{]mso-style-name:\s*(.+);/g;
	var match = re.exec(styleInfo);
	while (match != null) {
		// matched text: match[0]
		// match start: match.index
		classNames[match[1]] = match[2].replace("\\","").replace(/"/,"");
		match = re.exec(styleInfo);
	}
	//Start by string-processing MSO markup into something we can read and reloading
	if (jQ("article").length) {
		return ; //Don't run twice
	}

	jQ("o\\:SmartTagType").each(function(){(jQ(this).replaceWith(jQ(this).html()))});
	jQ("head").html(loseWordMongrelMarkup(jQ("head").html()));

	jQ("body").html(loseWordMongrelMarkup(jQ("body").get(0).innerHTML));

	//Get rid of the worst of the embedded stuff
	jQ("xml").remove();
	//Get rid of Word's sections
	jQ("div").each(
		function(index) {
	   jQ(this).children(":first-child").unwrap();
	}
	
	);
	
	

	
	processparas();
	
	//Add Schema.org markup
	jQ("table[summary^='itemprop']").each(function() {
		prop = jQ(this).attr("summary");
		prop = prop.replace(/itemprop-/,"");
		jQ(this).attr("itemprop", prop);
		jQ(this).removeAttr("summary");
	});
	
	//Wordprocessor microformat - needs work.
	jQ("a[href^='http://schema.org/'], a[href^='http://purl.org/'] ").each(function() {
		var href = jQ(this).attr("href");
		container = jQ(this).parents("tr:not(:first-child),table,section,article,body").first();
		//Use split on '?' instead?
		
		typeProp = href.split("?itemprop=");
		container.attr("itemtype", typeProp[0]);
		if (typeProp.length == 2) {
			jQ(container).attr("itemprop", typeProp[1]);
		}
		
		container.attr("itemscope", "itemscope");
		jQ(this).replaceWith(jQ(this).html());
		
	});


        jQ("*[class^='itemprop']").each(function() {
		prop = jQ(this).attr("class");alert(prop);
		if (prop.search(/-itemprop$/) > -1) {
		    //The property is in an HREF in embedded link
			container = jQ(this);
			prop = jQ(this).find("a[href]").get(0).attr("href");
			jQ(this).find("a[href]").find("*:first").unwrap();
			
		}
		else {
			prop = prop.replace(/itemprop-/,"");
			inHeading = jQ(this).parent("h1,h2,h3,h4,h5");
			if  (inHeading.length) {
				//Itemprop on a heading means it applies 
				container.get(0).attr("itemprop", prop);
				jQ(this).find("*:first").unwrap();
			}

			else {
				container = jQ(this);
			}
			}
		container.attr("itemprop", prop);
		container.removeAttr("class");
	});
	
	//Clean it all up
	//jQ("span[style] *:first-child").unwrap();

        
	jQ("span[mso-spacerun]").replaceWith(" ");
	
	
	
        
	jQ("i[style], b[style]").each(function(){jQ(this).removeAttr("style");});
	
	jQ("v:shapetype").remove();
	
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

	//Deal with hidden stuff, particularly embedded JSON from Zotero
	jQ("span[class='mso-conditional']").each(function() {
	   
		embeddedObjType  = jQ(this).attr("data");
		if (embeddedObjType === "if supportFields") {
			var contents = jQ(this).text();
			
			var zoteroData = /ADDIN ZOTERO_ITEM CSL_CITATION/;
			if (contents.match(zoteroData)) {
				console.log("XX" + jQ(this).next().html());
				var data = addLineBreaks(contents.replace(zoteroData, ""));
				 
				var dataURI = "data:application/json,"  + escape(data);
				var citeRef = jQ("<link itemprop='url'></link>");
				var next = jQ(this).next();
				citeRef.attr("href",dataURI);
				jQ(this).replaceWith(citeRef);
				citeRef.wrap(jQ("<span itemprop='cites' itemscope='itemscope' itemtype='http://schema.org/ScholarlyArticle'></span>"));
				citeRef.parent().append(next);
				next.wrap("<span itemprop='label'>");
				
			}
		}
		else if (embeddedObjType === "if !vml") {
			jQ(this).find("img").unwrap();
		}

			
		
		jQ(this).remove();

	});
	//TODO make this configurable
	jQ("span[lang^='EN']").each(function(i) {$(this).replaceWith($(this).html()	)});
	
	var unwantedSpans = "span[class='SpellE'], span[class='GramE'], span[style], span[data]";
	while (jQ(unwantedSpans).length) {
		jQ(unwantedSpans).each(function(i) {jQ(this).replaceWith(jQ(this).html())});
	}

      
	 	
   }
   word2html.convert = convert;
   word2html.config = config;
  
   if (typeof chrome === 'undefined' ||  typeof chrome.extension === 'undefined')  {
	logoURL = "http://tools.scholarlyhtml.org/w2html5/WordDownBackground.png";
	}
   else {
		logoURL = chrome.extension.getURL('logo-Xalon-ext.png');
			
		
   }	
   jQ("body").css("background-image", "url(" + logoURL + ")");
   jQ("body").css("background-repeat", "no-repeat");
  
 

   
   return word2html;

}







