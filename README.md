Wolo Code - WebApp
=========================

Communicate exact location points within a city with just 3 simple words

Technology:

Hosting:
Firebase hosting

Backend:
Firebase functions

Database:
Firebase Realtime Database

Dependencies:
Modules:
1. Cutie - Framework
		https://github.com/blank-org/cutie-framework
		The base framework for web site/app
2. Tiggu
		https://github.com/blank-org/tiggu
		Web publishing toolset
3. UMB
		https://github.com/ujLion/update-my-browser
		updatemybrowser.org is an initiative to spread modern browsers among all internet users
4. UMB - wrapper
		https://github.com/ujLion/umb-wrapper
		Wrapper to generate UMB.js code from @ujLion/update-my-browser

Programs:
1. httpd - Apache http server
		https://httpd.apache.org
2. php
		https://php.org
3. PowerShell
		https://github.com/PowerShell/PowerShell
		
Fonts:
	Abel

Debugging:
Local network debug:

http redirects to https://local.app.wolo.codes  
https goes through directly.  
Hence, for local debugging go to: https://&lt;ip&gt;

Build:
Commands:
	clean | publish prod
	firebase.cmd deploy --only hosting -P prod
	
For website portion - publish it first separately
That build is included automatically on deploy
