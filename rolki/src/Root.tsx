import { Composition, Still } from 'remotion';
import { SlajdKaruzeli, SlajdProps, OkladkaProfilu, OkladkaProps } from './Karuzela';
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
    <Still
      id="Slajd"
      component={SlajdKaruzeli}
      width={1080}
      height={1350}
      defaultProps={{ slajd: { typ: 'okladka', etykieta: 'Dotacja z PUP', tytul: 'Przykładowa okładka' }, nr: 1, razem: 1 } as SlajdProps}
    />
    <Still id="Okladka" component={OkladkaProfilu} width={1080} height={1080} defaultProps={{} as OkladkaProps} />
  </>
);
