
# Commandline tools for converting office documents to HTML

You need to install unoconv script which automates OpenOffice/Libre office.

This forked version of unoconv works best as it can export multiple sheets from spreadsheets as CSV :  https://github.com/uws-eresearch/unoconv

Make sure the unoconv utility is on your PATH, eg on Ubuntu:
     sudo mkdir /opt/unoconv
     sudo chown -r $USER:$USER /opt/unoconv
     git clone https://github.com/uws-eresearch/unoconv.git /opt/unoconv
     echo 'export $PATH:/opt/unoconv' >> ~/.bashrc
     

This set of tools comes with wrappers to for use with the [Of The Web (OTW)](https://github.com/uws-eresearch/otw) project, an automated framework for document conversion to web-ready formats  

 
