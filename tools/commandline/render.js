var page = require('webpage').create(),
    address, output, size;
var system = require('system');

if (system.args.length < 2 || system.args.length > 3) {
    console.log('Usage: render.js URL path-to-save ');
    phantom.exit();
} else {
    address = system.args[1];
    output = system.args[2];
    page.viewportSize = { width: 6000, height: 6000 };
    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('Unable to load the address!');
	        console.log(address);
        } else {
            window.setTimeout(function () {
				page.injectJs('../w2html5/jquery-1.6.4.js');
				page.injectJs('../w2html5/w2html5.js');
			
				
				var s = page.evaluate(function () {
				    
					converter = word2HML5Factory($);
					var originalHTML = $("html").html();
					
					converter.convert();
				        var newHTML = $("html").html();
				  
					return newHTML ? newHTML : orginalHTML;
					
				});
				var fs = require('fs');
				console.log("Saving: " + output);
				fs.write(output,s,"w");
				
                phantom.exit();
            }, 200);
        }
    });
}
