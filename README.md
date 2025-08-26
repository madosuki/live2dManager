# Live2dManager
This library is unofficial.  
This library codes is based on [Live2D Web Official Typescript Sample](https://github.com/Live2D/CubismWebSamples). Therefore, this library license is same on based, and use Live2D SDK For Web.  
Currently do not manage. Only provied helper functions.  
  
Using gitsubmodule for CubismWebFramework and CubismWebMotionSyncComponents.  
If use this library, should set [lib2dcubismcore](https://www.live2d.com/sdk/download/web/) files and [CRI/live2dcubismmotionsynccore.min.js](https://www.live2d.com/sdk/download/motionsync/) to public dir of your projects and add load process into your html(like: index.html).  
Because lib2dcubismcore files and CRI/live2dcubismmotionsynccore.min.js is `proprietary`, and can only obtain in https://www.live2d.com/sdk/download/web/ and https://www.live2d.com/sdk/download/motionsync/.  

# LICENSE
See in LICENSE.md

# For Dev
Instead do npm install --ignore-script. Because avoid defined scripts in preinstall and postinstall section for app.

# Usage
- Install  
  npm install https://github.com/madosuki/live2dManager.git
- Example
```typescript
const canvas = document.createElement("canvas");
const live2dViewer = new Live2dViewer(canvas, width, height);
const live2dManager = new Live2dManager(live2dViewer);
live2dManager.initialize();

const readFileFunction = async (filePath: string): Promise<ArrayBuffer> => {
    try {
        const res = await fetch(filePath);
        return await res.arrayBuffer();
    } catch (e) {
        return new ArrayBuffer(0);
    }
};
const live2dModel = new Live2dModel("foo/", "foo.model3.json", live2dViewer, readFileFunction);
await live2dModel.loadAssets();
live2dViewer.addModel("Record Key", live2dModel);

let requestAnimationFameHandler = 0;
const loop = () => {
     live2dViewer.updateTime();

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearDepth(1.0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      if (live2dViewer._programId) {
        gl.useProgram(live2dViewer._programId);
      }
      gl.flush();

      const { width, height } = live2dViewer.canvas;

      const projection = live2dViewer.getNewMatrix44();

      const model: Live2dModel | Live2dMotionSyncModel | undefined =
      live2dViewer.getModelFromKey(live2dViewer.getCurrentModelKey());
      
      const draw = () => {
        if (model.getModel()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
              model.getModelMatrix().setWidth(2.0);
              projection.scale(1.0, width / height);
          } else {
              projection.scale(height / width, 1.0);
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          projection.multiplyByMatrix(live2dViewer._viewMatrix);

          model.update();
          model.draw(projection, 0, 0, width, height, live2dViewer.frameBuffer);
        }
      };
      if (modell != undefined && model.isCompleteSetup) {
          draw();
      }

      requestAnimationFrameHandler = requestAnimationFrame(loop);
    };

requestAnimationFrameHandler = requestAnimationFrame(loop);

```
- Release Viewer
```typescript
live2dViewer.release();
```

- Release Viewer and Dispose Live2D
```typescript
live2dManager.release();
```

