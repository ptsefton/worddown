


var setupPage = function() {
	
	jQ = $;
	//
	
	
	
}



var format = function(csl) {
    var killCslBar = function() {
		jQ("#csl-bar").remove();
	}
	var showCslBar = function(el) {
	    if (!jQ("#csl-bar").length) {
			cslbar = jQ("<span id='csl-bar'>Choose a reference format: </span>");
			cslbar.append("<span id='ieee'>IEEE</span>&nbsp;");
			//cslbar.append("<span id='bluebook'>bluebook_demo</span>&nbsp;");
			cslbar.append("<span id='chicago_author_date'>Chicago Author-Date</span>&nbsp;");
			//cslbar.append("<span id='chicago_fullnote_bibliography2'>Chicago Fullnote Bibliography</span>&nbsp;");
			cslbar.css({"background-color" : "blue" , "color" : "white"});
		}
		el.after(cslbar);
		cslbar.find('#ieee').click(function() {killCslBar();format(ieee);});
		//cslbar.find('#bluebook').click(function() {killCslBar();format(bluebook_demo);});
		cslbar.find('#chicago_author_date').click(function() {killCslBar();format(chicago_author_date);});
		//cslbar.find('#chicago_fullnote_bibliography2').click(function() {killCslBar();format(chicago_fullnote_bibliography2);});
	}
   
    if (csl == undefined) { csl = chicago_author_date};
	
	
	var Sys = function(abbreviations,data){
		this.abbreviations = abbreviations;
		this.data = data;
	};

	Sys.prototype.retrieveItem = function(id){
		return this.data[id];
	};

	Sys.prototype.retrieveLocale = function(lang){
		return locale[lang];
	};

	Sys.prototype.getAbbreviations = function(name,vartype){
		return this.abbreviations[name][vartype];
	};

	var items = [];
	var citations = {};
	var data = {};
	//TODO define get data 
	jQ = $;
	//First pass thru the document to get citation data - for now assume DataURI encoded JSON
	
	jQ("*[itemprop='cites']").each(function () {
	   
		jQ(this).css({"background-color" : "red" , "color" : "white"});
		jQ(this).click(function(){showCslBar(jQ(this))});
		
		//TODO - don't assume this is encoded - you might have to fetch the data!
		citeData = unescape(jQ(this).find("*[itemprop='url']").attr("href").split(",").pop());
		citeData = citeData.replace(/(\\r\\n|\\n|\\r)/gm," ");
		
        //alert(citeData);		
		var citation = eval('(' + citeData + ')');
		//TODO build a list of items in order
		id = citation.citationID;
		//console.log(id);
		jQ(this).attr("data-citationID",id);
		citations[id] = citation;	
		jQ.each(citation.citationItems, function(i,n) {	
			data[n.id] = n.itemData;
			items.push(n.id);
			});
		

		});

               
		var citeproc, output;
		var sys = new Sys(abbreviations, data); 
		var citeproc = new CSL.Engine(sys, csl);


		var output;
			
		//Second pass to format the citations and insert
		jQ("*[data-citationID]").each(function () {
			cluster = citations[jQ(this).attr("data-citationID")];
			console.log(JSON.stringify(cluster));
			citationInstance = citeproc.appendCitationCluster(cluster).pop().pop();
			
			jQ(this).find("span").html(citationInstance);
			
		    
		});
		
		//Then come up with a micrododata way of saying the same thing
		 output = citeproc.makeBibliography();
		if (output) {
			jQ("*[itemtype='http://purl.org/orb/References']").html(output.slice(1).toString());
			}
			
			
}



	// Chicago Author-Date chicago_author_date


	// Bluebook and subsectioned bib bluebook_demo
	

	// Listing chicago_author_date_listing


	// IEEE -- ieee
	

	// Annotated -- chicago_fullnote_bibliography2
	

