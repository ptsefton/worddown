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
 *  <a href="javascript:(function(){var head=document.getElementsByTagName('head')[0],script=document.createElement('script');script.type='text/javascript';script.src='http://jischtml5.googlecode.com/git/tools/bookmarklets/recite/recite-bookmarklet.js';head.appendChild(script);})(); void 0">ReCite</a>
 * Adapted by Peter Sefton
 * MicrodataJS can be obtained from here: https://gitorious.org/microdatajs/ 
 * And jszip from here: https://github.com/Stuk/jszip.git
 */


var host = "http://tools.scholarlyhtml.org/tools/recite/";
window.bookmarklet = function(opts){fullFunc(opts)};
 
// These are the styles, scripts and callbacks we include in our bookmarklet:
window.bookmarklet({
 
    css : [host + "W3C-WD.css", host + "w2html5.css"],
    js  : [host + 'w2html5.js'], 
    jqpath : 'http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js', 
    ready : function(){
	 	converter = word2HML5Factory($);
		
		converter.convert();
 
   	    }
})
 
function fullFunc(a){function d(b){if(b.length===0){a.ready();return false}$.getScript(b[0],function(){d(b.slice(1))})}function e(b){$.each(b,function(c,f){$("<link>").attr({href:f,rel:"stylesheet"}).appendTo("head")})}a.jqpath=a.jqpath||"http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js";(function(b){var c=document.createElement("script");c.type="text/javascript";c.src=b;c.onload=function(){e(a.css);d(a.js)};document.body.appendChild(c)})(a.jqpath)};
