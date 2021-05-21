. crc32.ps1

$crc = get-crc32 ./public/root.js
mv ./public/root.js ./public/root-$crc.js

$file = ".\public\index.html"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace 'src="/root.js', ('src="/root-'+$crc+'.js') | Set-Content -Path $file

$file = ".\public\sw.js"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace './root.js', ('./root-'+$crc+'.js') | Set-Content -Path $file

$crc = get-crc32 ./public/console.js
mv ./public/console.js ./public/console-$crc.js

$file = ".\public\console.html"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace 'src="/console.js', ('src="/console-'+$crc+'.js') | Set-Content -Path $file

$file = ".\public\sw.js"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace './console.js', ('./console-'+$crc+'.js') | Set-Content -Path $file

cd ..\..\Website\Project\
deposit
