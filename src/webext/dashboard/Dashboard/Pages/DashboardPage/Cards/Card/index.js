// @flow

import React, { PureComponent } from 'react'
import moment from 'moment'
import { pushAlternating } from 'cmn/lib/all'

import { STATUS, installUnsigned, save, process } from '../../../../../../flow-control/extensions'

import IMAGE_CWS from './images/chrome-web-store-logo-2012-2015.svg'
import IMAGE_EXT_GENERIC from './images/extension-generic-flat-black.svg'
import IMAGE_FOLDER from './images/folder.svg'

import './index.css'

import type { Entry as Extension, Status } from '../../../../../../flow-control/extensions'

type Props = {
    ...Extension,
    dispatchProxied: *
}

type State = {
    ago: string
}

function getName(name, listingTitle) {
    return name || listingTitle.substr(0, listingTitle.lastIndexOf(' - '));
}

class Card extends PureComponent<Props, State> {
    agoInterval: number
    state = {
        ago: this.getAgo()
    }

    componentDidMount() {
        this.agoInterval = setInterval(() => this.setState(() => ({ ago:this.getAgo() })), 30000);
    }
    componentWillUnmount() {
        clearInterval(this.agoInterval);
    }
    render() {
        const { name, date, version, storeUrl, listingTitle, status, fileId, xpiFileId, signedFileId, kind } = this.props;
        const { ago } = this.state;

        return (
            <div className="Card">
                <div className="Card--background" />
                <div className="Card--row Card--row--title">
                    <img className="Card--logo" src={IMAGE_EXT_GENERIC} alt="" />
                    <h3 className="Card--title">
                        { getName(name, listingTitle) }
                    </h3>
                </div>
                <hr className="Card--divider-title" />
                <div className="Card--row">
                    <div className="Card--label">
                        Source
                    </div>
                    <a className="Card--link" href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <img src={kind === 'file' ? IMAGE_FOLDER : IMAGE_CWS} alt="" className="Card--link-image" />
                        <span className="Card--link-label">
                        { kind === 'file' ? 'Your Computer' : listingTitle }
                        </span>
                    </a>
                </div>
                { [fileId, xpiFileId, signedFileId].some( entry => entry ) &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Save to Disk
                        </div>
                        { pushAlternating([
                            fileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveExt} key="file">CRX</a>,
                            xpiFileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveUnsigned} key="xpi">Unsigned</a>,
                            signedFileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveSigned} key="signed">Signed</a>
                        ].filter(el => el), <span>&nbsp;|&nbsp;</span>) }
                    </div>
                }
                { version !== undefined &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Version
                        </div>
                        <span className="Card--text">{version}</span>
                    </div>
                }
                { (!status || (xpiFileId || signedFileId)) &&
                    <div className="Card--row Card--row--buttons">
                        { xpiFileId && !signedFileId && <a href="#" className="Card--link Card--link-button" onClick={this.handleClickInstallUnsigned}>Install Unsigned</a> }
                        { signedFileId && <a href="#" className="Card--link Card--link-button">Install</a> }
                        { !xpiFileId && !signedFileId && <span>Invalid status state</span> }
                    </div>
                }
                { status &&
                    <div className="Card--row">
                        <div className="Card--status-wrap">
                            { this.getStatusMessage() }
                        </div>
                    </div>
                }
                <div className="Card--footer">
                    { ago }
                </div>
            </div>
        )
    }

    handleClickInstallUnsigned = stopEvent(() => this.props.dispatchProxied(installUnsigned(this.props.id)) ) // TODO: show box explaining unsigned only installs in dev/nightly if they are beta/release/esr - and show directions on how to install it as temporary

    handleClickSaveExt = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'ext')) )
    handleClickSaveUnsigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'unsigned')) )
    handleClickSaveSigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'signed')) )

    getAgo() {
        return moment(this.props.date).fromNow();
    }

    getStatusMessage() {
        const { status, statusExtra } = this.props;
        switch (status) {
            case STATUS.DOWNLOADING: return `Downloading from store ${statusExtra.progress}%`;
            case STATUS.PARSEING: return 'Parsing';
            case STATUS.CONVERTING: return 'Converting';
            case 'CREDENTIALING': return 'Checking AMO Credentials';
            case 'NOT_LOGGED_IN': return (
                <div className="Card--status-wrap">
                    <span className="Card--status--bad">You are not logged in on AMO</span>
                    <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                    <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/" target="_blank" rel="noopener noreferrer">Login Now</a>
                    &nbsp;
                    <a href="#" className="Card--link Card--link--retry" onClick={this.retry}>Retry Now</a>
                </div>
            );
            case 'NEEDS_AGREE': return (
                <div className="Card--status-wrap">
                    <span className="Card--status--bad">You need to accept AMO agreement</span>
                    <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                    <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/en-US/developers/addon/api/key/" target="_blank" rel="noopener noreferrer">View Agreement</a>
                    &nbsp;
                    <a href="#" className="Card--link Card--link--retry" onClick={this.retry}>Retry Now</a>
                </div>
            );
            case 'GENERATING_KEYS': return 'Generating AMO Credentials';
            case 'MODING': return 'Preparing presigned package';
            case 'UPLOADING': return `Uploading for review ${statusExtra.progress}%`;
            case 'CHECKING_REVIEW': return 'Checking review progress';
            case 'WAITING_REVIEW': return `Waiting for review - ${statusExtra.sec}s`;
            case 'FAILED_REVIEW': return (
                <div className="Card--status-wrap">
                    <span className="Card--status--bad">AMO validation failed</span>
                    <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                    <a className="Card--link Card--link--retry" href={statusExtra.validationUrl} target="_blank" rel="noopener noreferrer">View Validation Results</a>
                    &nbsp;
                    <a href="#" className="Card--link Card--link--retry" onClick={this.retry}>Retry Now</a>
                </div>
            );
            case 'DOWNLOADING_SIGNED': return `Downloading signed ${statusExtra.progress}%`;
            default: return (
                <div className="Card--status-wrap">
                    <span className="Card--status--bad">{status}</span>
                    <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                    <a href="#" className="Card--link Card--link--retry" onClick={this.retry}>Retry Now</a>
                </div>
            );
        }
    }

    retry = e => {
        const { dispatchProxied, id } = this.props;
        e.preventDefault();
        dispatchProxied(process(id));
    }
}

function stopEvent(func) {
    return e => {
        e.preventDefault();
        e.stopPropagation();
        func(e);
    }
}

// function stopEvent(func<T: Node>: (e: SyntheticEvent<T>) => void) {
//     return e => {
//         e.preventDefault();
//         e.stopPropagation();
//         func(e);
//     }
// }

export default Card
