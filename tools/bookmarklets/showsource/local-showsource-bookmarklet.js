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
 *	sudo python -m SimpleHTTPServer 8001
 * Adapted by Peter Sefton
 * MicrodataJS can be obtained from here: https://gitorious.org/microdatajs/ 
 * And jszip from here: https://github.com/Stuk/jszip.git
 */

var host = "http://localhost:8001/tools/showsource/"; 

window.bookmarklet = function(opts){fullFunc(opts)};
 
// These are the styles, scripts and callbacks we include in our bookmarklet:
window.bookmarklet({
 
    css : [host + "showsource.css"],
    js  : [host + 'jszip/jszip.js', host + 'microdatajs/lib/json2.js',host + 'microdatajs/jquery.microdata.js', host + 'microdatajs/jquery.microdata.json.js', host + 'showsource.js'],    
    jqpath : 'http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js', 
    ready : function(){
	 	showSource();
 
   	    }
})
 
function fullFunc(a){function d(b){if(b.length===0){a.ready();return false}$.getScript(b[0],function(){d(b.slice(1))})}function e(b){$.each(b,function(c,f){$("<link>").attr({href:f,rel:"stylesheet"}).appendTo("head")})}a.jqpath=a.jqpath||"http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js";(function(b){var c=document.createElement("script");c.type="text/javascript";c.src=b;c.onload=function(){e(a.css);d(a.js)};document.body.appendChild(c)})(a.jqpath)};
