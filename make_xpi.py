#!/usr/bin/env python3

import re
import os
import zipfile
from pathlib import Path


filename = str(Path.home()) + os.sep + "ses_tb.xpi"
filelist = []
for (path, dirs, files) in os.walk("."):
    if ".git" in path:
        continue
    filelist += [(path + os.sep + X)[2:] for X in files
        if not re.match("^((.*~)|(_.*))$", X)]

with zipfile.ZipFile(filename, "w") as ses:
    [ses.write(X) for X in filelist]
