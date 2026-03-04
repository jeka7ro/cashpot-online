import sys
import subprocess

try:
    import pypdf
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    import pypdf

reader = pypdf.PdfReader('/Users/eugeniucazmal/Downloads/dev_office/03 martie 2026/cashpot_online/190269_ROM.SFX.1001.01#132.pdf')
for page in reader.pages:
    print(page.extract_text())
