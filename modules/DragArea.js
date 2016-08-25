import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';

import forOwn from 'lodash.forOwn';
import isEmpty from 'lodash.isEmpty';
import isFunction from 'lodash.isFunction';
import last from 'lodash.last';
import takeRight from 'lodash.takeRight';
import wrap from 'lodash.wrap';

const getOffset = (el) => {
    const rect = el.getBoundingClientRect();

    return {
        top: rect.top + document.body.scrollTop,
        left: rect.left + document.body.scrollLeft,
    };
};

const proxyToParent = (ctx, fn, eventName) => {
    if (isFunction(ctx.props[eventName])) {
        const parentFn = ctx.props[eventName];

        return wrap(fn, (func, e) => {
            fn(e);
            parentFn(e);
        });
    }

    return fn;
};
// curentTime, beginValue, finalValue, totalDuration
function easeOutQuint(t, b, _c, d) {
    const c = _c - b;
    return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
}

function inRange(a, b, x) {
    const low = Math.min(a, b);
    const high = Math.max(a, b);

    return low <= x && x <= high;
}

function momentumFactory(startVelocity, endVelocity, duration) {
    let lastVelocity = startVelocity;
    let lastTime = Date.now();
    let totalDistance = 0;
    let elapsedTime = 0;

    return function(currentTime) {
        if (!currentTime) {
            currentTime = Date.now();
        }

        const deltaTime = currentTime - lastTime;
        elapsedTime = elapsedTime + deltaTime;

        if (elapsedTime >= duration) {
            return {
                deltaVelocity: 0,
                deltaDistance: 0,
                deltaTime: deltaTime || 0,
                totalDistance: totalDistance || 0,
                currentVelocity: endVelocity || 0,
                ended: true,
            };
        }

        const newVelocity = easeOutQuint(elapsedTime, startVelocity, endVelocity, duration);
        const deltaVelocity = newVelocity - lastVelocity;

        const acceleration = deltaVelocity / deltaTime;

        const deltaDistance = (lastVelocity * deltaTime + (1 / 2) * acceleration * Math.pow(deltaTime, 2));

        if (elapsedTime > 0) {
            // debugger;
        }

        lastVelocity = newVelocity;
        lastTime = currentTime;
        totalDistance = totalDistance + deltaDistance;

        return {
            deltaVelocity: deltaVelocity || 0,
            deltaTime: deltaTime || 0,
            deltaDistance: deltaDistance || 0,
            distance: totalDistance || 0,
            velocity: newVelocity || 0,
            ended: false,
        };
    };
}

// Used for averaging out velocities
const MOMENTUM_SCROLL_TIME = 1.95 * 1000;
const eventsCacheCount = 4;

class DragArea extends React.Component {
    state = {
        mouseDown: false,
        dragStartX: 0,
        dragStartY: 0,
        timestamp: null,
        eventsCache: [],
        isEmulatingMomentum: false,
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.emulateDragMomentumX !== this.props.emulateDragMomentumX ||
            nextProps.emulateDragMomentumY !== this.props.emulateDragMomentumY) {
            this.setState({
                isEmulatingMomentum: false,
            });
        }
    }

    getClientXY(event) {
        const offset = getOffset(ReactDOM.findDOMNode(this));

        if (!isEmpty(event.changedTouches)) {

            return {
                x: last(event.changedTouches).clientX - offset.left,
                y: last(event.changedTouches).clientY - offset.top,
                isTouchEvent: true,
            };
        }

        return {
            x: event.clientX - offset.left,
            y: event.clientY - offset.top,
            isTouchEvent: false,
        };
    }

    processMomentum = (momentumFns) => {
        if (!this.state.isEmulatingMomentum) {
            return false;
        }

        const newState = {};
        const dragMoveProps = {};
        let stillAnimating = false;
        // debugger;
        if (momentumFns.x) {
            const newX = momentumFns.x();

            newState.velocityX = newX.velocity;
            dragMoveProps.deltaX = newX.deltaDistance;

            if (newX.ended === false) {
                stillAnimating = true;
            } else {
                delete momentumFns.x;
            }
        }

        if (momentumFns.y) {
            const newY = momentumFns.y();

            newState.velocityY = newY.velocity;
            dragMoveProps.deltaY = newY.deltaDistance;

            if (newY.ended === false) {
                stillAnimating = true;
            } else {
                delete momentumFns.y;
            }
        }

        if (stillAnimating) {
            this.setState(newState);
            this.props.onDragMove(dragMoveProps);

            window.requestAnimationFrame(this.processMomentum.bind(null, momentumFns));
        } else {
            this.setState({
                isEmulatingMomentum: false,
            });
        }
        return false;
    }

    _handleMouseDown = (ev) => {
        const position = this.getClientXY(ev);

        this.setState({
            mouseDown: true,
            dragStartX: position.x,
            dragStartY: position.y,
            velocityX: 0,
            velocityY: 0,
            timestamp: ev.timeStamp,
            eventsCache: [],
            isEmulatingMomentum: false,
        });

        if (this.props.onGrab) {
            this.props.onGrab(position, ev);
        }
    }

    _handleMouseUp = (ev) => {
        this.setState({
            mouseDown: false,
        });

        const animators = {};

        if (this.props.emulateDragMomentumX) {
            if (Math.abs(this.state.velocityX) > this.props.momentumThreshold) {
                animators.x = momentumFactory(this.state.velocityX, 0, MOMENTUM_SCROLL_TIME);
            }
        }

        if (this.props.emulateDragMomentumY) {
            if (Math.abs(this.state.velocityY) > this.props.momentumThreshold) {
                animators.y = momentumFactory(this.state.velocityY, 0, MOMENTUM_SCROLL_TIME);
            }
        }

        if (animators.x || animators.y) {
            this.setState({
                isEmulatingMomentum: true,
            }, () => {
                this.processMomentum(animators);
            });
        }

        if (this.props.onRelease) {
            this.props.onRelease(ev);
        }
    }

    _handleMouseMove = (ev) => {
        let stopEvent = true;
        const currentPosition = this.getClientXY(ev);

        if (!this.state.mouseDown) {
            this.setState({
                lastMousePosition: currentPosition,
            });

            if (this.props.updateMousePosition) {
                this.props.updateMousePosition(currentPosition);
            }

        } else {
            if (currentPosition.x === 0 && currentPosition.y === 0) {
                // this is being returned on dragEnd on chrome
                return this._handleMouseUp();
            }

            const deltaX = (currentPosition.x - this.state.dragStartX) || 0;
            const deltaY = (currentPosition.y - this.state.dragStartY) || 0;

            const duration = ev.timeStamp - this.state.timeStamp;

            let eventsCache = this.state.eventsCache.slice(0);

            eventsCache.push({
                deltaX,
                deltaY,
                x: currentPosition.x,
                y: currentPosition.y,
                duration,
                velocityX: deltaX / duration,
                velocityY: deltaY / duration,
            });

            eventsCache = takeRight(eventsCache, eventsCacheCount);

            const velocityX = eventsCache.reduce((memo, e) => (
                memo + e.velocityX
            ), 0) / eventsCacheCount;

            const velocityY = eventsCache.reduce((memo, e) => (
                memo + e.velocityY
            ), 0) / eventsCacheCount;

            const averagedDeltaX = eventsCache.reduce((memo, e) => (
                memo + e.deltaX
            ), 0) / eventsCacheCount;

            const averagedDeltaY = eventsCache.reduce((memo, e) => (
                memo + e.deltaY
            ), 0) / eventsCacheCount;

            const dragAngle = Math.atan2(averagedDeltaY, averagedDeltaX) * 180 / Math.PI;

            this.setState({
                dragStartX: currentPosition.x || 0,
                dragStartY: currentPosition.y || 0,
                timeStamp: ev.timeStamp,
                velocityX: velocityX || 0,
                velocityY: velocityY || 0,
                eventsCache,
            });

            this.props.onDragMove({
                x: currentPosition.x || 0,
                y: currentPosition.y || 0,
                deltaX,
                deltaY,
                timeStamp: ev.timeStamp,
                velocityX: velocityX || 0,
                velocityY: velocityY || 0,
                angle: dragAngle,
            }, ev);

            if (currentPosition.isTouchEvent) {
                if (this.props.preventNaturalDragX === false && this.props.preventNaturalDragY === false) {
                    stopEvent = false;
                } else {
                    if (this.props.preventNaturalDragX === false && (
                            inRange(160, 180, dragAngle) ||
                            inRange(-160, -180, dragAngle) ||
                            inRange(-20, 20, dragAngle)
                        )) {

                        stopEvent = false;
                    }

                    if (this.props.preventNaturalDragY === false && (
                            inRange(70, 110, dragAngle) ||
                            inRange(-70, -110, dragAngle)
                        )) {

                        stopEvent = false;
                    }
                }
            } else {
                stopEvent = false;
            }

            if (stopEvent) {
                ev.preventDefault();
                ev.stopPropagation();
            }
        }
        return false;
    }

    _handleWheel = (ev) => {
        const currentPosition = this.getClientXY(ev);

        this.setState({
            isEmulatingMomentum: false,
        });

        this.props.onDragMove({
            x: currentPosition.x || 0,
            y: currentPosition.y || 0,
            deltaX: -1 * ev.deltaX || 0,
            deltaY: -1 * ev.deltaY || 0,
            timeStamp: ev.timeStamp,
            velocityX: 0,
            velocityY: 0,
        }, ev);
    }

    render() {
        const events = {};

        const children = this.props.children;

        if (this.props.enableMouse) {
            events.onMouseDown = this._handleMouseDown;
            events.onMouseMove = this._handleMouseMove;

            if (this.state.mouseDown) {
                events.onMouseUp = this._handleMouseUp;
                events.onMouseLeave = this._handleMouseUp;
            }
        }

        if (this.props.enableTouch) {
            events.onTouchStart = this._handleMouseDown;
            events.onTouchEnd = this._handleMouseUp;
            events.onTouchMove = this._handleMouseMove;
        }

        if (this.props.enableWheel) {
            events.onWheel = this._handleWheel;
        }

        // Make sure we keep parent events;
        forOwn(events, function(value, key) {
            events[key] = proxyToParent(children, value, key);
        });

        return React.cloneElement(this.props.children, events);
    }
}

DragArea.defaultProps = {
    momentumThreshold: 0,
};

DragArea.propTypes = {
    children: PropTypes.element.isRequired,
    emulateDragMomentumX: PropTypes.bool,
    emulateDragMomentumY: PropTypes.bool,
    enableMouse: PropTypes.bool,
    enableTouch: PropTypes.bool,
    enableWheel: PropTypes.bool,
    momentumThreshold: PropTypes.number,
    onDragMove: PropTypes.func.isRequired,
    onGrab: PropTypes.func,
    onRelease: PropTypes.func,
    preventNaturalDragX: PropTypes.bool,
    preventNaturalDragY: PropTypes.bool,
    updateMousePosition: PropTypes.func,
};

export default DragArea;
