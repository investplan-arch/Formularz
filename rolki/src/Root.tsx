import { Composition } from 'remotion';
import { Rolka, RolkaProps, czasTrwania } from './Rolka';
import { Start, START_DLUGOSC } from './Start';
import lista from '../scenariusze/lista.json';

const FPS = 30;

export const Root = () => (
  <>
    <Composition
      id="Rolka"
      component={Rolka}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={czasTrwania(lista as RolkaProps, FPS)}
      defaultProps={lista as RolkaProps}
      calculateMetadata={({ props }) => ({ durationInFrames: czasTrwania(props, FPS) })}
    />
    <Composition id="Start" component={Start} width={1080} height={1920} fps={FPS} durationInFrames={START_DLUGOSC} />
  </>
);
