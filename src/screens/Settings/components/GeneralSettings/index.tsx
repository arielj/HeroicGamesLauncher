import React, {
  useContext,
  useEffect,
  useState
} from 'react'

import { Path } from 'src/types'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import InfoBox from 'src/components/UI/InfoBox'
import LanguageSelector from 'src/components/UI/LanguageSelector'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

import { IpcRenderer } from 'electron'
import Backspace from '@material-ui/icons/Backspace'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'

const {
  ipcRenderer
} = window.require('electron') as {ipcRenderer: IpcRenderer}

const storage: Storage = window.localStorage

interface Props {
  altLegendaryBin: string
  checkForUpdatesOnStartup: boolean,
  darkTrayIcon: boolean,
  defaultInstallPath: string,
  egsLinkedPath: string,
  egsPath: string,
  exitToTray: boolean,
  language: string,
  maxWorkers: number,
  setDefaultInstallPath: (value: string) => void,
  setEgsLinkedPath: (value: string) => void,
  setEgsPath: (value: string) => void,
  setLanguage: (value: string) => void,
  setAltLegendaryBin: (value: string) => void,
  setMaxWorkers: (value: number) => void,
  startInTray: boolean,
  toggleDarkTrayIcon: () => void,
  toggleStartInTray: () => void,
  toggleCheckUpdatesOnStartup: () => void
  toggleTray: () => void
}

export default function GeneralSettings({
  defaultInstallPath,
  setDefaultInstallPath,
  egsPath,
  checkForUpdatesOnStartup,
  setEgsPath,
  altLegendaryBin,
  setAltLegendaryBin,
  egsLinkedPath,
  setEgsLinkedPath,
  exitToTray,
  startInTray,
  toggleTray,
  toggleStartInTray,
  language,
  setLanguage,
  maxWorkers,
  setMaxWorkers,
  darkTrayIcon,
  toggleDarkTrayIcon,
  toggleCheckUpdatesOnStartup
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [maxCpus, setMaxCpus] = useState(maxWorkers)
  const [legendaryVersion, setLegendaryVersion] = useState('')
  const { platform, refreshLibrary } = useContext(ContextProvider)
  const { t, i18n } = useTranslation()
  const isLinked = Boolean(egsLinkedPath.length)
  const isWindows = platform === 'win32'

  useEffect(() => {
    i18n.changeLanguage(language)
    storage.setItem('language', language)
  }, [language])

  useEffect(() => {
    const getMoreInfo = async () => {
      const cores = await ipcRenderer.invoke('getMaxCpus')
      const legendaryVer = await ipcRenderer.invoke('getLegendaryVersion')
      setMaxCpus(cores)
      if (legendaryVer === 'invalid'){
        setLegendaryVersion('Invalid')
        setTimeout(() => {
          setAltLegendaryBin('')
          return setLegendaryVersion('')
        }, 1500);
      }
      return setLegendaryVersion(legendaryVer)
    }
    getMoreInfo()
  }, [maxWorkers, altLegendaryBin])

  async function handleSync() {
    setIsSyncing(true)
    if (isLinked) {
      return await ipcRenderer.invoke('egsSync', 'unlink').then(async () => {
        await ipcRenderer.invoke('openMessageBox', {
          message: t('message.unsync'),
          title: 'EGS Sync'
        })
        setEgsLinkedPath('')
        setEgsPath('')
        setIsSyncing(false)
        refreshLibrary({fullRefresh: true, runInBackground: false})
      })
    }

    return await ipcRenderer
      .invoke('egsSync', egsPath)
      .then(async (res: string) => {
        if (res === 'Error') {
          setIsSyncing(false)
          ipcRenderer.invoke('showErrorBox', [t('box.error.title', 'Error'), t('box.sync.error')])
          setEgsLinkedPath('')
          setEgsPath('')
          return
        }
        await ipcRenderer.invoke('openMessageBox', {
          message: t('message.sync'),
          title: 'EGS Sync'
        })

        setIsSyncing(false)
        setEgsLinkedPath(isWindows ? 'windows' : egsPath)
        refreshLibrary({fullRefresh: true, runInBackground: false})
      })
  }

  function handleEgsFolder(){
    if (isLinked) {
      return ''
    }
    return ipcRenderer.invoke(
      'openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.choose-egs-prefix')
      })
      .then(({ path }: Path) =>
        setEgsPath(path ? `'${path}'` : '')
      )
  }

  function handleLegendaryBinary(){
    return ipcRenderer.invoke(
      'openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t('box.choose-legendary-binary', 'Select Legendary Binary')
      })
      .then(({ path }: Path) =>
        setAltLegendaryBin(path ? `'${path}'` : '')
      )
  }

  async function handleChangeLanguage(language: string) {
    ipcRenderer.send('changeLanguage', language)
    setLanguage(language)
  }

  function handleWeblate() {
    return ipcRenderer.send('openWeblate')
  }

  return (
    <>
      <span className="setting" data-testid="generalSettings">
        <span className="settingText">{t('setting.language')}</span>
        <LanguageSelector
          handleLanguageChange={handleChangeLanguage}
          currentLanguage={language}
        />
        <a data-testid="buttonWeblate" onClick={handleWeblate} className="smallLink">{t('other.weblate', 'Help Improve this translation.')}</a>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.default-install-path')}</span>
        <span>
          <input
            data-testid="setinstallpath"
            type="text"
            value={defaultInstallPath.replaceAll("'", '')}
            className="settingSelect"
            placeholder={defaultInstallPath}
            onChange={(event) => setDefaultInstallPath(event.target.value)}
          />
          <CreateNewFolder
            data-testid="setinstallpathbutton"
            className="material-icons settings folder"
            onClick={() =>
              ipcRenderer.invoke('openDialog', {
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
                title: t('box.default-install-path')
              }).then(({ path }: Path) =>
                setDefaultInstallPath(path ? `'${path}'` : defaultInstallPath)
              )
            }
          />
        </span>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.alt-legendary-bin', 'Choose an alternative Legendary Binary to use')}</span>
        <span>
          <input
            data-testid="setting-alt-legendary"
            type="text"
            placeholder={t('placeholder.alt-legendary-bin', 'Using built-in Legendary binary...')}
            className="settingSelect"
            value={altLegendaryBin.replaceAll("'", '')}
            onChange={(event) => setAltLegendaryBin(event.target.value)}
          />
          {!altLegendaryBin.length ? (
            <CreateNewFolder
              data-testid="setLegendaryBinaryButton"
              className="material-icons settings folder"
              style={{ color: altLegendaryBin.length ? 'transparent' : '#B0ABB6' }}
              onClick={() => handleLegendaryBinary()}
            />
          ) : (
            <Backspace
              data-testid="setLegendaryBinaryBackspace"
              className="material-icons settings folder"
              onClick={() => (setAltLegendaryBin(''))}
              style={ { color: '#B0ABB6' }}
            />
          )}
        </span>
        <span className="smallMessage">{t('other.legendary-version', 'Legendary Version: ')}{legendaryVersion}</span>
      </span>
      {!isWindows && <span className="setting">
        <span className="settingText">{t('setting.egs-sync')}</span>
        <span className="settingInputWithButton">
          <input
            data-testid="setEpicSyncPath"
            type="text"
            placeholder={t('placeholder.egs-prefix')}
            className="settingSelect"
            value={egsPath || egsLinkedPath}
            disabled={isLinked}
            onChange={(event) => setEgsPath(event.target.value)}
          />
          {!egsPath.length ? (
            <CreateNewFolder
              data-testid="setEpicSyncPathButton"
              className="material-icons settings folder"
              style={{ color: isLinked ? 'transparent' : '#B0ABB6' }}
              onClick={() => handleEgsFolder()}
            />
          ) : (
            <Backspace
              data-testid="setEpicSyncPathBackspace"
              className="material-icons settings folder"
              onClick={() => (isLinked ? '' : setEgsPath(''))}
              style={
                isLinked
                  ? { color: 'transparent', pointerEvents: 'none' }
                  : { color: '#B0ABB6' }
              }
            />
          )}
          <button
            data-testid="syncButton"
            onClick={() => handleSync()}
            disabled={isSyncing || !egsPath.length}
            className={`button is-small ${
              isLinked ? 'is-danger' : isSyncing ? 'is-primary' : 'settings'
            }`}
          >
            {`${
              isLinked
                ? t('button.unsync')
                : isSyncing
                  ? t('button.syncing')
                  : t('button.sync')
            }`}
          </button>
        </span>
      </span>}
      {isWindows && <span className="setting">
        <span className="toggleWrapper">
          {t('setting.egs-sync')}
          <ToggleSwitch dataTestId="syncToggle" value={isLinked} handleChange={handleSync} />
        </span>
      </span>}
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.exit-to-tray')}
          <ToggleSwitch
            dataTestId="exitToTray"
            value={exitToTray}
            handleChange={toggleTray}
          />
        </span>
      </span>
      { exitToTray && <span className="setting">
        <span className="toggleWrapper">
          {t('setting.start-in-tray', 'Start Minimized')}
          <ToggleSwitch
            dataTestId="startInTray"
            value={startInTray}
            handleChange={toggleStartInTray}
          />
        </span>
      </span> }
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.darktray', 'Use Dark Tray Icon (needs restart)')}
          <ToggleSwitch
            value={darkTrayIcon}
            handleChange={() => {
              toggleDarkTrayIcon()
              return ipcRenderer.send('changeTrayColor')
            }}
          />
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.checkForUpdatesOnStartup', 'Check For Updates On Startup')}
          <ToggleSwitch
            value={checkForUpdatesOnStartup}
            handleChange={toggleCheckUpdatesOnStartup}
          />
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.maxworkers')}
          <select
            data-testid="setMaxWorkers"
            onChange={(event) => setMaxWorkers(Number(event.target.value))}
            value={maxWorkers}
            className="settingSelect smaller"
          >
            {Array.from(Array(maxCpus).keys()).map((n) => (
              <option key={n + 1}>{n + 1}</option>
            ))}
            <option key={0} value={0}>
              Max
            </option>
          </select>
        </span>
      </span>
      <InfoBox text="infobox.help">{t('help.general')}</InfoBox>
    </>
  )
}
