import os
import re
import shutil
import subprocess
import json

from selenium.webdriver.firefox.webdriver import FirefoxProfile,  \
    FirefoxBinary
from selenium.webdriver.chrome.options import Options
import selenic

#
# LOGS determines whether Selenium tests will capture logs. Turning it
# on makes the tests much slower.
#
if "LOGS" not in globals():
    LOGS = False


class Config(selenic.Config):

    def make_selenium_desired_capabilities(self):
        ret = super(Config, self).make_selenium_desired_capabilities()

        if self.browser == "INTERNETEXPLORER":
            ret["requireWindowFocus"] = True

        ret["tags"] = [self.browser]
        return ret

#
# SELENIUM_NAME will appear suffixed after the default "Wed Test" name...
#
name = "Wed Test"
suffix = os.environ.get("SELENIUM_NAME", None)
if suffix:
    name += ": " + suffix

# Grab the current build number.
describe = subprocess.check_output(["git", "describe"])
# Grab the current reported version of wed
with open("package.json") as pk:
    version_data = json.load(pk)
version = version_data["version"]

caps = {
    # We have to turn this on...
    "nativeEvents": True,
    "name": name,
    "selenium-version": "2.43.0",
    "chromedriver-version": "2.11",
    "build": "version: " + version + ", git describe: " + describe
}

if not LOGS:
    caps["record-screenshots"] = "false"
    caps["record-video"] = "false"
    caps["record-logs"] = "false"
    caps["sauce-advisor"] = "false"

#
# The order of the configs is a balancing act
#

#
# Perform these first because they are extremely cheap to perform.
#
config = Config("Linux", "FIREFOX", "31")
config = Config("Linux", "CHROME", "39")

#
# Perform these next because IE compatibility is a major
# issue. Finding problems early pays.
#
config = Config("Windows 8", "INTERNETEXPLORER", "10", caps, remote=True)
config = Config("Windows 8.1", "INTERNETEXPLORER", "11", caps, remote=True)

#
# Perform these next because OS X compatibility is an issue. Again, we
# want to find problems early.
#
config = Config("OS X 10.9", "CHROME", "38", caps, remote=True)
config = Config("OS X 10.9", "CHROME", "37", caps, remote=True)
# wed definitely breaks on Chrome 34.
# config = Config("OS X 10.6", "CHROME", "34", caps, remote=True)

#
# The rest is unlikely to fail if the previous tests passed.
#
config = Config("Windows 8.1", "CHROME", "38", caps, remote=True)
config = Config("Windows 8.1", "CHROME", "37", caps, remote=True)
# wed definitely breaks on Chrome 34.
# config = Config("Windows 8.1", "CHROME", "34", caps, remote=True)

# ESR
config = Config("Windows 8.1", "FIREFOX", "31", caps, remote=True)
# Previous ESR: Nope. FF24 fails. Not worth keeping up so it is gone...
# config = Config("Windows 8.1", "FIREFOX", "24", caps, remote=True)

#
# FAILING COMBINATIONS
#
# Fails due to a resizing bug in Selenium:
#
# config = Config("Windows 8.1", "FIREFOX", "26", caps, remote=True)
#
# FF does not support native events in OS X.
#
# config = Config("OS X 10.6", "FIREFOX", "..", caps, remote=True)
#

#
# The config is obtained from the TEST_BROWSER environment variable.
#
browser_env = os.environ.get("TEST_BROWSER", None)
if browser_env:
    # When invoked from a Jenkins setup, the spaces that would
    # normally appear in names like "Windows 8.1" will appear as
    # underscores instead. And the separators will be "|" rather than
    # ",".
    parts = re.split(r"[,|]", browser_env.replace("_", " "))
    CONFIG = selenic.get_config(
        platform=parts[0] or None, browser=parts[1] or None,
        version=parts[2] or None)

    if CONFIG.browser == "CHROME":
        CHROME_OPTIONS = Options()
        #
        # This prevents getting message shown in Chrome about
        # --ignore-certificate-errors
        #
        # --test-type is an **experimental** option. Reevaluate this
        # --use.
        #
        CHROME_OPTIONS.add_argument("test-type")

    profile = FirefoxProfile()
    # profile.set_preference("webdriver.log.file",
    #                        "/tmp/firefox_webdriver.log")
    # profile.set_preference("webdriver.firefox.logfile",
    #                         "/tmp/firefox.log")

    #
    # This turns off the downloading prompt in FF.
    #
    tmp_path = "selenium_tests/tmp"
    shutil.rmtree(tmp_path, True)
    os.makedirs(tmp_path)
    profile.set_preference("browser.download.folderList", 2)
    profile.set_preference("browser.download.manager.showWhenStarting",
                           False)
    profile.set_preference("browser.download.dir", tmp_path)
    profile.set_preference(
        "browser.helperApps.neverAsk.saveToDisk", "text/xml")
    FIREFOX_PROFILE = profile

    def post_execution():
        shutil.rmtree(tmp_path, True)

# May be required to get native events.
# FIREFOX_BINARY = FirefoxBinary("/home/ldd/src/firefox-24/firefox")

#
# Location of our server. Changing this use standalone rather than
# standalone-optimized will run the tests on the non-optimized version
# of the code.
#
WED_ROOT = "/forever/build/standalone-optimized"
