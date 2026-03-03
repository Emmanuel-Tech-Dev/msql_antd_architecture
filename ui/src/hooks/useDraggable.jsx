import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';

const useDraggable = () => {
    const [disabled, setDisabled] = useState(true); // ✅ start disabled
    const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
    const draggleRef = useRef(null);

    const onStart = (_event, uiData) => {
        const { clientWidth, clientHeight } = window.document.documentElement;
        const targetRect = draggleRef.current?.getBoundingClientRect();
        if (!targetRect) return;
        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y,
            bottom: clientHeight - (targetRect.bottom - uiData.y),
        });
    };

    const draggableTitleProps = {
        style: { width: '100%', cursor: 'move' },
        onMouseOver: () => { if (disabled) setDisabled(false); },
        onMouseOut: () => setDisabled(true),
        onFocus: () => { },
        onBlur: () => { },
    };

    // ✅ Pass nodeRef instead of relying on findDOMNode
    const drag = (modal) => (
        <Draggable
            disabled={disabled}
            bounds={bounds}
            nodeRef={draggleRef}        // ✅ key fix — bypasses findDOMNode
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>{modal}</div>
        </Draggable>
    );

    return { drag, draggableTitleProps };
};

export default useDraggable;