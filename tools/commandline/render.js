var page = require('webpage').create(),
    address, output, size;

if (phantom.args.length < 2 || phantom.args.length > 3) {
    console.log('Usage: render.js URL path-to-save ');
    phantom.exit();
} else {
    address = phantom.args[0];
    output = phantom.args[1];
    page.viewportSize = { width: 600, height: 600 };
    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('Unable to load the address!');
        } else {
            window.setTimeout(function () {
				page.injectJs('../w2html5/jquery-1.6.4.js');
				page.injectJs('../w2html5/w2html5.js');
				
                //page.render("test1.pdf");
				
				var source = page.evaluate(function () {
					converter = word2HML5Factory($);
					converter.convert();
					return document.documentElement.outerHTML;
					
				});
				var fs = require('fs');
				console.log("saving" + output);
				fs.write(output,source,"w");
				//console.log(source);
                phantom.exit();
            }, 200);
        }
    });
}