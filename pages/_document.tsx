import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* MediaPipe AI Pose 엔진 전역 프리로드 (라우팅 이동 시 카메라 즉시 구동 보장) */}
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossOrigin="anonymous" />
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossOrigin="anonymous" />
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
