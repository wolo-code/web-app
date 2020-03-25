. crc32.ps1

$crc = get-crc32 ./public/root.js
mv ./public/root.js ./public/root-$crc.js

$file = ".\public\index.html"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace '<script src="/root', ('<script src="/root-'+$crc) | Set-Content -Path $file

$file = ".\public\sw.js"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace './root', ('./root-'+$crc) | Set-Content -Path $file

$crc = get-crc32 ./public/console.js
mv ./public/console.js ./public/console-$crc.js

$file = ".\public\console.html"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace '<script src="/console', ('<script src="/console-'+$crc) | Set-Content -Path $file

$file = ".\public\sw.js"
$text = (Get-Content -Path $file -ReadCount 0) -join "`n"
$text -replace './console', ('./console-'+$crc) | Set-Content -Path $file

cd ..\..\Website\Project\
deposit
