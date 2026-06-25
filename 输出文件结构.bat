@echo off
chcp 65001 >nul
setlocal

rem 切换到 BAT 文件所在的文件夹
pushd "%~dp0"

rem 输出文件名称
set "OUTPUT=folder_structure.txt"

rem 先在临时目录生成，避免输出文件本身出现在目录结构中
set "TEMP_OUTPUT=%TEMP%\folder_structure_%RANDOM%_%RANDOM%.txt"

echo 正在遍历文件夹，请稍候……

rem /F：显示所有文件
rem /A：使用普通 ASCII 字符绘制结构，兼容文本文件
tree "%~dp0" /F /A > "%TEMP_OUTPUT%"

rem 将结果移动到当前文件夹
move /Y "%TEMP_OUTPUT%" "%~dp0%OUTPUT%" >nul

echo.
echo 遍历完成。
echo 文件已保存到：
echo %~dp0%OUTPUT%
echo.

popd
pause