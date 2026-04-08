Add-Type -AssemblyName System.Drawing

$publicDir = "c:\Users\Carlos\WebstormProjects\Patrimio\public"
$srcPath = "$publicDir\logo.png"

function Make-SquareIcon {
    param(
        [string]$inputPath,
        [string]$outputPath,
        [int]$size,
        [System.Drawing.Color]$bgColor
    )
    $src = [System.Drawing.Image]::FromFile($inputPath)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear($bgColor)

    $scaleW = [double]$size / $src.Width
    $scaleH = [double]$size / $src.Height
    $scale = if ($scaleW -lt $scaleH) { $scaleW } else { $scaleH }
    $w = [int]($src.Width * $scale)
    $h = [int]($src.Height * $scale)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)

    $g.DrawImage($src, $x, $y, $w, $h)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Host ("OK " + [System.IO.Path]::GetFileName($outputPath) + " (" + $size + "x" + $size + ")")
}

Write-Host 'Generando iconos PWA desde logo.png...'

Make-SquareIcon $srcPath "$publicDir\icon-512.png"          512 ([System.Drawing.Color]::Transparent)
Make-SquareIcon $srcPath "$publicDir\icon-192.png"          192 ([System.Drawing.Color]::Transparent)
Make-SquareIcon $srcPath "$publicDir\icon-512-maskable.png" 512 ([System.Drawing.Color]::White)
Make-SquareIcon $srcPath "$publicDir\apple-touch-icon.png"  180 ([System.Drawing.Color]::White)

Write-Host 'Listo.'
