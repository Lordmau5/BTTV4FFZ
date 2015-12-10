require "fileutils"

puts "Please enter the version (Pattern: 1.0.4, 2.0.5, 3.3.3): "
$version = gets.strip

##########################################################
## 						Firefox																		##
##########################################################

def ff_copy_template()
	FileUtils.cp("Firefox/template__/install.rdf", "Firefox/install.rdf")
	FileUtils.cp("Firefox/template__/package.json", "Firefox/package.json")
end
ff_copy_template

def ff_replace_version()
	text = File.read("Firefox/install.rdf")
	new_content = text.gsub(/%%VERSION%%/, $version)

	File.open("Firefox/install.rdf", "w") { |file| file.puts new_content }

	######################################################################

	text = File.read("Firefox/package.json")
	new_content = text.gsub(/%%VERSION%%/, $version)

	File.open("Firefox/package.json", "w") { |file| file.puts new_content }
end
ff_replace_version

def ff_archive_xpi()
	%x(files/7za.exe a archives/BTTV4FFZ-#{$version}.xpi .\\Firefox\\*)
	%x(files/7za.exe d archives/BTTV4FFZ-#{$version}.xpi template__)
end
ff_archive_xpi

##########################################################
## 						 Chrome																		##
##########################################################

def ch_copy_template()
	FileUtils.cp("Chrome/template__/manifest.json", "Chrome/manifest.json")
end
ch_copy_template

def ch_replace_version()
	text = File.read("Chrome/manifest.json")
	new_content = text.gsub(/%%VERSION%%/, $version)

	File.open("Chrome/manifest.json", "w") { |file| file.puts new_content }
end
ch_replace_version

def ch_archive_zip()
	%x(files/7za.exe a archives/BTTV4FFZ-#{$version}.zip .\\Chrome\\*)
	%x(files/7za.exe d archives/BTTV4FFZ-#{$version}.zip template__)
end
ch_archive_zip
