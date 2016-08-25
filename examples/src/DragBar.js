import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import DragArea from 'react-dragarea';

import classNames from './dragbar.scss';

const DragBar = React.createClass({

    propTypes: {
        onDragMove: PropTypes.func,
        onGrab: PropTypes.func,
        onRelease: PropTypes.func,
        scrollAreaWidth: PropTypes.number.isRequired,
        scrollOffset: PropTypes.number.isRequired,
        setOffset: PropTypes.func.isRequired,
        winWidth: PropTypes.number.isRequired,
    },

    getInitialState() {
        return {
            scrollOffset: 0,
            mode: 'scroll',
            settingsVisible: false,
            firstLoad: true,
            activeHoverPerson: false,
            frame: 0,
            hasInteracted: false,
            grabbingHandle: false,
        };
    },

    updateMousePosition(position) {
        this.setState({
            mouseProgressX: position.x / this.props.winWidth
        });
    },

    _handleClick(ev) {
        if (ev.target !== ReactDOM.findDOMNode(this.refs.handle)) {
            this.props.setOffset(-1 * this.state.mouseProgressX * this.props.scrollAreaWidth);
        }
    },

    _handleGrab(position, ev) {

        if (ev.target === ReactDOM.findDOMNode(this.refs.handle)) {
            this.setState({
                grabbingHandle: true
            });
        }
        this.props.onGrab(position, ev);
    },

    _handleDragMove(data, ev) {
        if (this.state.grabbingHandle) {
            let percentMoved = data.deltaX / this.props.winWidth;
            let amountMoved = percentMoved * (this.props.scrollAreaWidth);

            this.props.onDragMove({
                deltaX: -1 * amountMoved,
            });
        }
    },

    _handleRelease(ev) {
        this.setState({
            grabbingHandle: false
        });

        this.props.onRelease(ev);
    },

    _handleWheel(ev) {
        let angleOfScroll = Math.abs(Math.atan2(ev.deltaY, ev.deltaX) * (180 / Math.PI));

        //Prevent browser scroll / back/forward history nav if we're scrolling horizontally
        if (angleOfScroll <= 60 || angleOfScroll >= 120) {

            this._handleDragMove({
                deltaX: -1 * ev.deltaX,
                velocityX: 0,
            });

            ev.preventDefault();
            ev.stopPropagation();
        }
    },

    getStyle() {
        let handleOffset = 100 * Math.abs(this.props.scrollOffset / (this.props.scrollAreaWidth -
            this.props.winWidth));

        if (handleOffset >= 99.8) {
            handleOffset = 100;
        }

        return {
            handle: {
                left: handleOffset + '%',
                transform: ['translateX(', -1 * handleOffset, '%)'].join(''),
            },
        };
    },

    render() {
        const style = this.getStyle();

        const handleClassNames = [classNames.progress];

        if (this.state.grabbingHandle) {
            handleClassNames.push(classNames.grabbing);

        }

        return (
            <DragArea
                onGrab={this._handleGrab}
                onRelease={this._handleRelease}
                onDragMove={this._handleDragMove}
                updateMousePosition={this.updateMousePosition}
                enableWheel
                enableMouse
                enableTouch
                preventNaturalDragX
                >

                <span className={classNames.root}>
                    <span className={classNames.background} onClick={this._handleClick}>
                        <span ref="handle" className={handleClassNames.join(' ')} style={style.handle}/>
                    </span>
                </span>
            </DragArea>
        );
    },
});

export default DragBar;
