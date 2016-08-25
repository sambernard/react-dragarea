import React, { PropTypes } from 'react';
import DragBar from './DragBar';

export class Example1 extends React.Component {

    state = {
        scrollOffset: 0,
        grabbing: false,
    }

    onDragMove = ({ deltaX }) => {
        this.setState({ scrollOffset: Math.min(this.state.scrollOffset + deltaX, 0) });
    }

    onGrab = () => {
        this.setState({
            grabbing: true,
        });
    }

    onRelease = () => {
        this.setState({
            grabbing: false,
        });
    }

    setOffset = (scrollOffset) => {
        this.setState({ scrollOffset });
    }

    render() {
        return (
            <div>
                <ul>
                    <li>Grabbing: {this.state.grabbing.toString()}</li>
                    <li>Scroll Offset: {this.state.scrollOffset}</li>
                </ul>

                <DragBar
                    onDragMove={this.onDragMove}
                    onGrab={this.onGrab}
                    onRelease={this.onRelease}
                    scrollAreaWidth={3 * window.innerWidth}
                    scrollOffset={this.state.scrollOffset}
                    setOffset={this.setOffset}
                    winWidth={window.innerWidth}
                    showDragHint
                     />
            </div>
        );
    }
}
