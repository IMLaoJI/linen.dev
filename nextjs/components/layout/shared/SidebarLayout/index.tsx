import React from 'react';
import classNames from 'classnames';
import { Transition } from '@headlessui/react';
import useDevice from 'hooks/device';
import { Mode } from 'hooks/mode';
import styles from './index.module.scss';

interface Props {
  left: React.ReactNode;
  right?: React.ReactNode;
  leftRef?: any;
  rightRef?: any;
  onLeftScroll?(): void;
  onRightScroll?(): void;
  mode?: Mode;
}

function SidebarLayout({
  left,
  right,
  leftRef,
  rightRef,
  onLeftScroll,
  onRightScroll,
  mode,
}: Props) {
  const { isMobile } = useDevice();
  return (
    <>
      <Transition
        show={isMobile && !!right ? false : true}
        className={
          'flex-col overflow-auto lg:h-[calc(100vh_-_64px)] md:h-[calc(100vh_-_144px)] h-[calc(100vh_-_152px)] lg:w-[calc(100vw_-_200px)] flex justify-left w-[100vw] relative'
        }
        onScroll={onLeftScroll}
        ref={leftRef}
      >
        {left}
      </Transition>
      <Transition
        show={!!right}
        className={classNames(styles.right, 'md:w-[700px]')}
      >
        {right && (
          <div
            className={classNames(
              styles.content,
              'overflow-auto flex flex-col relative'
            )}
            onScroll={onRightScroll}
            ref={rightRef}
          >
            {right}
          </div>
        )}
      </Transition>
    </>
  );
}

export default SidebarLayout;
