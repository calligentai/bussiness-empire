#!/usr/bin/env python3
import os,plistlib,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LABEL='com.calligentai.business-empire.paperclip'
SERVICE=f'gui/{os.getuid()}/{LABEL}'
def main():
    path=Path.home()/'Library/LaunchAgents'/f'{LABEL}.plist'
    if subprocess.run(['launchctl','print',SERVICE],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:
        raise SystemExit('Service already installed. Inspect it before replacing configuration.')
    path.parent.mkdir(parents=True,exist_ok=True)
    state=ROOT/'.local/paperclip'
    state.mkdir(parents=True,exist_ok=True,mode=0o700)
    config={'Label':LABEL,'ProgramArguments':[sys.executable,str(ROOT/'scripts/paperclip-local.py'),'start'],'WorkingDirectory':str(ROOT),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':30,'EnvironmentVariables':{'PATH':str(Path.home()/'.local/bin')+':/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'},'StandardOutPath':str(state/'service.stdout.log'),'StandardErrorPath':str(state/'service.stderr.log')}
    with path.open('wb') as output: plistlib.dump(config,output)
    os.chmod(path,0o600)
    subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(path)],check=True)
    print('Installed user service '+LABEL)
if __name__=='__main__': main()
