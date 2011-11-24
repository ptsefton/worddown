/*
 * jQuery Bookmarklet - version 1.0
 * Originally written by: Brett Barros
 * With modifications by: Paul Irish
 *
 * If you use this script, please link back to the source
 *
 * Copyright (c) 2010 Latent Motion (http://latentmotion.com/how-to-create-a-jquery-bookmarklet/)
 * Released under the Creative Commons Attribution 3.0 Unported License,
 * as defined here: http://creativecommons.org/licenses/by/3.0/
 *
 *  <a href="javascript:(function(){var head=document.getElementsByTagName('head')[0],script=document.createElement('script');script.type='text/javascript';script.src='http://localhost:8001/local-showsource-bookmarklet.js?' + Math.floor(Math.random()*99999);head.appendChild(script);})(); void 0">Show data/source</a>
 * THIS VERSION IS FOR TESTING - ASSUMES YOU HAVE A WEBSERVER SERVING THE jishtml5 directory - eg 
 * 	cd /opt/schtml/jischtml5/
 *	sudo python -m SimpleHTTPServer 8000
 * Adapted by Peter Sefton
 * MicrodataJS can be obtained from here: https://gitorious.org/microdatajs/ 
 * And jszip from here: https://github.com/Stuk/jszip.git
 */

var host = "http://localhost:8001/tools/showsource/"; 
var hostRemote = "http://tools.scholarlyhtml.org/showsource/";


window.bookmarklet = function(opts){fullFunc(opts)};
 
// These are the styles, scripts and callbacks we include in our bookmarklet:
window.bookmarklet({
 
    css : [host + "showsource.css"],
    js  : [hostRemote + 'jszip/jszip.js', hostRemote + 'microdatajs/lib/json2.js',hostRemote + 'microdatajs/jquery.microdata.js', 
			hostRemote + 'microdatajs/jquery.microdata.json.js', host + 'showsource.js', host + 'xhtml.js'],    
    jqpath :  host + 'jquery-1.6.4.js', 
    ready : function(){
	 	showSource();
 
   	    }
})
 
function fullFunc(opts){
 
    // User doesn't have to set jquery, we have a default.
    opts.jqpath = opts.jqpath || "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js";
 
    function getJS(jsfiles){
 
	// Check if we've processed all of the JS files (or if there are none)
	if (jsfiles.length === 0) {
		opts.ready();
		return false;
	}
 
        // Load the first js file in the array
        $.getScript(jsfiles[0],  function(){ 
 
            // When it's done loading, remove it from the queue and call the function again    
            getJS(jsfiles.slice(1));
 
        })
 
    }
 
    // Synchronous loop for css files
    function getCSS(csfiles){
        $.each(csfiles, function(i, val){
            $('<link>').attr({
                    href: val,
                    rel: 'stylesheet'
                }).appendTo('head');
        });
    }
 
	function getjQuery(filename) {
 
		// Create jQuery script element
		var fileref = document.createElement('script')
		fileref.type = 'text/javascript';
		fileref.src =  filename;
 
		// Once loaded, trigger other scripts and styles
		fileref.onload = function(){
 
			getCSS(opts.css); // load CSS files
			getJS(opts.js); // load JS files
 
		};
 
		document.body.appendChild(fileref);
	}
 
	getjQuery(opts.jqpath); // kick it off
 
}; // end of bookmarklet();