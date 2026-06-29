@echo off
chcp 65001 >nul
setlocal EnableExtensions

pushd "%~dp0" || (
    echo 无法进入脚本所在目录。
    echo.
    pause
    exit /b 1
)

set "ROOT=%CD%"
set "SELF=%~f0"
set "OUTPUT=%ROOT%\portfolio-manifest.json"
set "TMP_PS1=%TEMP%\portfolio_manifest_%RANDOM%_%RANDOM%.ps1"
set "HYBRID_SELF=%SELF%"
set "HYBRID_TMP=%TMP_PS1%"

echo 正在生成 portfolio-manifest.json，请稍候……
echo.

rem 用 PowerShell 提取嵌入脚本，并写成带 BOM 的 UTF-8。
rem 这样 Windows PowerShell 5.1 也能正确读取中文字符串。
powershell -NoProfile -ExecutionPolicy Bypass -Command "$lines = Get-Content -LiteralPath $env:HYBRID_SELF -Encoding UTF8; $marker = [Array]::IndexOf($lines, ':__POWERSHELL__'); if ($marker -lt 0 -or $marker -ge ($lines.Length - 1)) { exit 2 }; $encoding = New-Object System.Text.UTF8Encoding($true); [System.IO.File]::WriteAllLines($env:HYBRID_TMP, [string[]]($lines[($marker + 1)..($lines.Length - 1)]), $encoding)"
set "EXTRACT_ERR=%ERRORLEVEL%"

if not "%EXTRACT_ERR%"=="0" (
    echo 提取临时 PowerShell 脚本失败，错误代码：%EXTRACT_ERR%
    echo.
    del "%TMP_PS1%" >nul 2>nul
    popd
    pause
    exit /b %EXTRACT_ERR%
)

if not exist "%TMP_PS1%" (
    echo 临时 PowerShell 脚本不存在。
    echo.
    popd
    pause
    exit /b 1
)

for %%F in ("%TMP_PS1%") do set "TMP_SIZE=%%~zF"
if "%TMP_SIZE%"=="0" (
    echo 临时 PowerShell 脚本为空。
    echo.
    del "%TMP_PS1%" >nul 2>nul
    popd
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP_PS1%" -Root "%ROOT%" -Output "%OUTPUT%"
set "ERR=%ERRORLEVEL%"

del "%TMP_PS1%" >nul 2>nul

echo.
if "%ERR%"=="0" (
    echo 已完成。
    echo JSON 已保存到：
    echo %OUTPUT%
    echo.
    if exist "%OUTPUT%" start "" "%OUTPUT%"
) else (
    echo 生成失败，错误代码：%ERR%
)

echo.
popd
pause
exit /b %ERR%

:__POWERSHELL__
param(
[Parameter(Mandatory = $true)]
[string]$Root,

[Parameter(Mandatory = $true)]
[string]$Output

)

$ErrorActionPreference = 'Stop'

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$outputPath = [System.IO.Path]::GetFullPath($Output)

$imageExtensions = @('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif')

$categories = @(
[pscustomobject]@{
key = 'architecture'
zh = '建筑'
en = 'Architecture'
coverStem = 'Architecture_cover'
folderPrefixes = @('Architecture_')
},
[pscustomobject]@{
key = 'robotic'
zh = '机器人建造'
en = 'Robotic Construction'
coverStem = 'Robotic Construction_cover'
folderPrefixes = @('Robotic Construction_', 'Robotic_Construction_')
},
[pscustomobject]@{
key = 'model'
zh = '实体模型'
en = 'Scale Model'
coverStem = 'Scale Model_cover'
folderPrefixes = @('Scale Model_')
},
[pscustomobject]@{
key = 'illustration'
zh = '插画'
en = 'Illustration'
coverStem = 'Illustration_cover'
folderPrefixes = @()
},
[pscustomobject]@{
key = 'goods'
zh = '产品'
en = 'Goods'
coverStem = 'Goods_cover'
folderPrefixes = @()
}
)

$typeOrder = @{
main     = 0
render   = 1
document = 1
model    = 2
site     = 3
axon     = 4
plan     = 5
section  = 6
diagram  = 7
process  = 7
unknown  = 8
}

function Test-ImageFile {
param([System.IO.FileInfo]$File)
$ext = $File.Extension.ToLowerInvariant()
return $imageExtensions -contains $ext
}

function Get-RelativePosixPath {
param(
[string]$Base,
[string]$Path
)

$baseFull = [System.IO.Path]::GetFullPath($Base)
if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
    $baseFull += [System.IO.Path]::DirectorySeparatorChar
}

$pathFull = [System.IO.Path]::GetFullPath($Path)
$baseUri = New-Object System.Uri($baseFull)
$pathUri = New-Object System.Uri($pathFull)

$relative = [System.Uri]::UnescapeDataString(
    $baseUri.MakeRelativeUri($pathUri).ToString()
)

return ($relative -replace '\\', '/')
}

function Get-NormalizedStem {
param([string]$Value)
$stem = [System.IO.Path]::GetFileNameWithoutExtension($Value).ToLowerInvariant()
return [regex]::Replace($stem, '[^a-z0-9]+', '')
}

function Get-CleanDisplayTitle {
param([string]$Value)
return ([regex]::Replace($Value, '^\s*\d+\s*[-_. ]*\s*', '')).Trim()
}

function Get-ProjectId {
param([string]$Value)
$id = ([regex]::Replace($Value.ToLowerInvariant(), '[^a-z0-9]+', '-')).Trim('-')
if ([string]::IsNullOrWhiteSpace($id)) { return 'project' }
return $id
}

function Get-InferredYear {
param([string]$Title)
if ($Title -match 'shell[\s-]*ter') { return '2025' }
return '2024'
}

function Get-ImageType {
param([string]$NameOrPath)

$filename = [System.IO.Path]::GetFileName($NameOrPath).ToLowerInvariant()

if ($filename.Contains('_main') -or $filename.Contains('_cover') -or $filename.Contains('主图')) {
    return 'main'
}
if ($filename.Contains('_render')) { return 'render' }
if ($filename.Contains('document')) { return 'document' }
if ($filename.Contains('_model')) { return 'model' }
if ($filename.Contains('_site')) { return 'site' }
if ($filename.Contains('_axon')) { return 'axon' }
if ($filename.Contains('_plan') -or $filename.Contains('plan_')) { return 'plan' }
if ($filename.Contains('_section')) { return 'section' }
if ($filename.Contains('diagram')) { return 'diagram' }
if ($filename.Contains('_process') -or $filename.Contains('过程')) { return 'process' }
return 'unknown'

}

function Get-TrailingNumber {
param([string]$NameOrPath)

$stem = [System.IO.Path]::GetFileNameWithoutExtension($NameOrPath)
$match = [regex]::Match($stem, '_(\d+)$')
if ($match.Success) {
    return [int]$match.Groups[1].Value
}
return [int]::MaxValue

}

function Get-SortedImageFiles {
param([System.IO.FileInfo[]]$Files)

return @(
    $Files | Sort-Object -Property @(
        @{ Expression = { $typeOrder[(Get-ImageType $_.Name)] } },
        @{ Expression = { Get-TrailingNumber $_.Name } },
        @{ Expression = { $_.Name.ToLowerInvariant() } }
    )
)

}

function Get-TitleFromFolder {
param(
[string]$FolderName,
[string[]]$Prefixes
)

$matchedPrefix = ''
foreach ($prefix in $Prefixes) {
    if ($FolderName.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        $matchedPrefix = $prefix
        break
    }
}

$raw = $FolderName.Substring($matchedPrefix.Length)
$raw = $raw -replace '[_-]+', ' '
return Get-CleanDisplayTitle $raw

}

function New-ProjectFromFolder {
param(
[System.IO.DirectoryInfo]$Folder,
[string]$CategoryKey,
[string]$CategoryName,
[string[]]$Prefixes
)

$files = Get-ChildItem -LiteralPath $Folder.FullName -Recurse -File |
    Where-Object { Test-ImageFile $_ }

if (-not $files -or $files.Count -eq 0) { return $null }

$sorted = Get-SortedImageFiles $files
$relativeImages = @(
    $sorted | ForEach-Object {
        Get-RelativePosixPath -Base $rootPath -Path $_.FullName
    }
)

$cover = $relativeImages | Where-Object { (Get-ImageType $_) -eq 'main' } | Select-Object -First 1
if (-not $cover) { $cover = $relativeImages[0] }

$title = Get-TitleFromFolder -FolderName $Folder.Name -Prefixes $Prefixes

return [ordered]@{
    id = Get-ProjectId $Folder.Name
    title = $title
    category = $CategoryName
    categoryKey = $CategoryKey
    year = Get-InferredYear $title
    cover = $cover
    description = ''
    images = $relativeImages
    kind = 'project'
}

}

function New-GroupedImageProjects {
param(
[System.IO.DirectoryInfo]$Dir,
[string]$CategoryKey,
[string]$CategoryName
)

if (-not $Dir.Exists) { return @() }

$groups = @{}
$files = Get-ChildItem -LiteralPath $Dir.FullName -Recurse -File |
    Where-Object { Test-ImageFile $_ } |
    Sort-Object FullName

foreach ($file in $files) {
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $match = [regex]::Match($stem, '^(.*)_(\d+)$')
    $groupStem = if ($match.Success) { $match.Groups[1].Value } else { $stem }
    $index = if ($match.Success) { [int]$match.Groups[2].Value } else { 1 }
    $key = $groupStem.ToLowerInvariant()

    if (-not $groups.ContainsKey($key)) {
        $title = $groupStem -replace '[_-]+', ' '
        $groups[$key] = [ordered]@{
            title = Get-CleanDisplayTitle $title
            items = New-Object System.Collections.ArrayList
        }
    }

    [void]$groups[$key].items.Add([ordered]@{
        index = $index
        path = Get-RelativePosixPath -Base $rootPath -Path $file.FullName
    })
}

$projects = foreach ($entry in $groups.GetEnumerator()) {
    $items = @(
        $entry.Value.items | Sort-Object -Property @(
            @{ Expression = { $_.index } },
            @{ Expression = { $_.path.ToLowerInvariant() } }
        )
    )

    $coverItem = $items | Where-Object { $_.index -eq 1 } | Select-Object -First 1
    $cover = if ($coverItem) { $coverItem.path } else { $items[0].path }

    [ordered]@{
        id = "$CategoryKey-" + (Get-ProjectId $entry.Key)
        title = $entry.Value.title
        category = $CategoryName
        categoryKey = $CategoryKey
        year = ''
        cover = $cover
        description = ''
        images = @($items | ForEach-Object { $_.path })
        kind = 'illustration'
    }
}

return @($projects | Sort-Object -Property @{ Expression = { $_.title.ToLowerInvariant() } })

}

$rootFiles = Get-ChildItem -LiteralPath $rootPath -File | Where-Object { Test-ImageFile $_ }

$manifestCategories = foreach ($category in $categories) {
$target = Get-NormalizedStem $category.coverStem
$coverMatch = $rootFiles | Where-Object {
(Get-NormalizedStem $_.Name) -eq $target
} | Select-Object -First 1

[ordered]@{
    key = $category.key
    title = [ordered]@{
        zh = $category.zh
        en = $category.en
    }
    coverStem = $category.coverStem
    image = if ($coverMatch) {
        Get-RelativePosixPath -Base $rootPath -Path $coverMatch.FullName
    } else {
        ''
    }
}

}

$projectsByCategory = [ordered]@{}
foreach ($category in $categories) {
$projectsByCategory[$category.key] = @()
}

foreach ($category in $categories | Where-Object { $_.folderPrefixes.Count -gt 0 }) {
$folders = Get-ChildItem -LiteralPath $rootPath -Directory | Where-Object {
$matched = $false
foreach ($prefix in $category.folderPrefixes) {
if ($_.Name.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
$matched = $true
break
}
}
$matched
} | Sort-Object Name

$projects = foreach ($folder in $folders) {
    New-ProjectFromFolder `
        -Folder $folder `
        -CategoryKey $category.key `
        -CategoryName $category.en `
        -Prefixes $category.folderPrefixes
}

$projectsByCategory[$category.key] = @($projects | Where-Object { $null -ne $_ })

}

$illustrationDir = [System.IO.DirectoryInfo](Join-Path $rootPath 'Illustration')
$goodsDir = [System.IO.DirectoryInfo](Join-Path $rootPath 'Goods')

$projectsByCategory['illustration'] = @(
New-GroupedImageProjects -Dir $illustrationDir -CategoryKey 'illustration' -CategoryName 'Illustration'
)

$projectsByCategory['goods'] = @(
New-GroupedImageProjects -Dir $goodsDir -CategoryKey 'goods' -CategoryName 'Goods'
)

$manifest = [ordered]@{
version = 1
generatedAt = [DateTime]::UtcNow.ToString('o')
root = '.'
categories = @($manifestCategories)
projectsByCategory = $projectsByCategory
}

$outputDir = Split-Path -Parent $outputPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$json = $manifest | ConvertTo-Json -Depth 12
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $json, $utf8NoBom)
