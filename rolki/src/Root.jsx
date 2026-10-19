import React from 'react';
import { Composition } from 'remotion';
import { Rolka, FPS, czasRolki } from './Rolka';
import { rolki } from './rolki';

export const Root = () => (
  <>
    {rolki.map((r) => (
      <Composition
        key={r.id}
        id={r.id}
        component={Rolka}
        durationInFrames={czasRolki(r)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ rolka: r }}
      />
    ))}
  </>
);
