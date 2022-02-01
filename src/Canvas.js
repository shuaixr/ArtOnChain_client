import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Popover,
  Skeleton,
  Snackbar,
} from "@mui/material";
import { BigNumber } from "ethers";
import { makeStyles } from "@material-ui/styles";
import global from "./global";
import PanToolIcon from "@mui/icons-material/PanTool";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import ClearIcon from "@mui/icons-material/Clear";
import BrushIcon from "@mui/icons-material/Brush";
import Panzoom from "@panzoom/panzoom";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import { useRecoilState } from "recoil";
import { AccountsState } from "./store";
import { SketchPicker } from "react-color";
const useStyles = makeStyles({
  canvas_pen: {
    position: "absolute",
    "z-index": -10,
  },
  canvas_cache: {
    position: "absolute",
    "z-index": -11,
  },
  canvas_bg: {
    position: "absolute",
    "z-index": -12,
  },
  disableColorReverseButton: {
    color: "rgba(0, 0, 0, 0.26)",
    "&:disabled": {
      color: "rgba(0, 0, 0, 0.54)",
    },
  },
});
export function Canvas() {
  const PIXEL_SIZE = 1;
  const [height, setHeight] = useState(450);
  const [width, setWidth] = useState(0);
  const [canvasPenMouseDown, setCanvasPenMouseDown] = useState(false);
  const [colorPickerAnchorEl, setColorPickerAnchorEl] = useState(null);
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [canvasMode, setCanvasMode] = useState("paint");
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [snackbarType, setSnackbarType] = useState("error");
  const panzoomParentRef = useRef();
  const canvasGroupRef = useRef();
  const canvasBgRef = useRef();
  const canvasPenRef = useRef();
  const canvasPen = canvasPenRef.current;
  const canvasCacheRef = useRef();
  const canvasCache = canvasCacheRef.current;
  const cacheCanvasMap = useRef(new Map());
  const canvasMap = useRef(new Map());
  const changeCountRef = useRef(-1);
  const panzoomRef = useRef(Panzoom);
  const [account] = useRecoilState(AccountsState);

  const clearCanvasCache = () => {
    canvasCache
      .getContext("2d")
      .clearRect(0, 0, canvasPen.width, canvasPen.height);
    cacheCanvasMap.current = new Map();
  };
  const showSackBar = (type, msg) => {
    setSnackbarOpen(false);
    setSnackbarMsg(msg);
    setSnackbarType(type);
    setSnackbarOpen(true);
  };
  const commit = async () => {
    if (account.length === 0) {
      showSackBar(
        "error",
        "You have not connected wallet. Please connect wallet and try again"
      );
      return;
    }
    if ((await global.provider.getNetwork()).chainId !== global.chainId) {
      showSackBar("error", "Wrong Network, Please select Polygon Mainnet");
      return;
    }
    if (cacheCanvasMap.current.size === 0) {
      showSackBar("error", "Empty change");
      return;
    }
    const signer = global.provider.getSigner();
    global.canvasContract = global.canvasContract.connect(signer);
    let drawArray = [];
    cacheCanvasMap.current.forEach((value, xy) => {
      const splitxy = xy.split("#");
      const x = parseInt(splitxy[0]);
      const y = parseInt(splitxy[1]);

      let color = (16777215 - parseInt(value.split("#")[1], 16)).toString();
      while (color.length < 8) color = "0" + color;
      drawArray.push(BigNumber.from((y * width + x).toString() + color));
    });
    try {
      await global.canvasContract.draw(drawArray);
    } catch (err) {
      showSackBar("error", err.message);
      return;
    }
    showSackBar(
      "success",
      "Submitted successfully, please wait for transaction confirmation"
    );
    clearCanvasCache();
  };
  //Switch between zoom mode and painting mode
  const switchMode = (mode) => {
    switch (mode) {
      case "move":
        panzoomRef.current.setOptions({
          disablePan: false,
        });
        panzoomRef.current.bind();
        break;
      case "eraser":
      case "paint":
        panzoomRef.current.setOptions({
          disablePan: true,
        });
        panzoomRef.current.destroy();
        break;
      default:
        console.log("err", mode);
    }
    setCanvasMode(mode);
  };
  const drawCanvasCache = (x, y) => {
    const canvasCacheContext = canvasCache.getContext("2d");
    canvasCacheContext.fillStyle = brushColor;
    const mapkey = x + "#" + y;
    if (canvasMode === "eraser") {
      cacheCanvasMap.current.delete(mapkey);
      canvasCacheContext.clearRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
    } else {
      if (
        cacheCanvasMap.current.size >= 255 &&
        !cacheCanvasMap.current.has(mapkey)
      ) {
        showSackBar(
          "error",
          "Gas exceeds limit! Only 255 pixels can be modified per commit."
        );
        return;
      }
      cacheCanvasMap.current.set(mapkey, brushColor);
      canvasCacheContext.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
    }
  };
  const onCanvasPenTouch = (e) => {
    const bounds = e.currentTarget.getBoundingClientRect();

    const pzTransformScale = panzoomRef.current.getScale();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches.item(i);
      console.log(touch);
      let x = touch.clientX - bounds.left;
      let y = touch.clientY - bounds.top;
      x = (x - (x % (PIXEL_SIZE * pzTransformScale))) / pzTransformScale;
      y = (y - (y % (PIXEL_SIZE * pzTransformScale))) / pzTransformScale;

      drawCanvasCache(x, y);
    }
  };
  const onCanvasPenMouseMove = (e) => {
    if (!(canvasMode === "paint" || canvasMode === "eraser")) return;
    const canvasPenContext = canvasPen.getContext("2d");
    canvasPenContext.clearRect(0, 0, canvasPen.width, canvasPen.height);

    const bounds = e.currentTarget.getBoundingClientRect();

    let x = e.clientX - bounds.left;
    let y = e.clientY - bounds.top;
    const pzTransformScale = panzoomRef.current.getScale();
    x = (x - (x % (PIXEL_SIZE * pzTransformScale))) / pzTransformScale;
    y = (y - (y % (PIXEL_SIZE * pzTransformScale))) / pzTransformScale;

    canvasPenContext.fillStyle = "#FF000050";
    canvasPenContext.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);

    if (!canvasPenMouseDown) return;
    drawCanvasCache(x, y);
  };

  //Init Contract
  useEffect(() => {
    (async () => {
      global.canvasContract = global.canvasContract.connect(global.provider);
      const height = (await global.dataCanvasContract.height()).toNumber();
      const width = (await global.dataCanvasContract.width()).toNumber();
      setHeight(height);
      setWidth(width);
      panzoomRef.current = Panzoom(canvasGroupRef.current, {
        startX: (panzoomParentRef.current.offsetWidth - width) / 2,
        cursor: "crosshair",
      });
      switchMode("paint");
      const contextBg = canvasBgRef.current.getContext("2d");
      contextBg.fillStyle = "#FFFFFF";
      contextBg.fillRect(0, 0, width * PIXEL_SIZE, height * PIXEL_SIZE);

      async function loop() {
        const newChangeCount = (
          await global.dataCanvasContract.changeCount()
        ).toNumber();
        if (newChangeCount !== changeCountRef.current) {
          const pixelCount = height * width;
          if (pixelCount !== 0) {
            try {
              for (let i = 0; i < Math.ceil(pixelCount / 100000); i++) {
                const line = await global.dataCanvasContract.getPixelLine(i);
                for (let j = 0; j < 100000; j++) {
                  const cou = i * 100000 + j;
                  const y = Math.floor(cou / width);
                  if (y >= height) break;

                  if (!canvasMap.current.has(cou) && line[j] === 0) continue;
                  if (canvasMap.current.get(cou) === line[j]) continue;
                  canvasMap.current.set(cou, line[j]);

                  let hexcolor = (16777215 - line[j]).toString(16);
                  while (hexcolor.length < 6) {
                    hexcolor = hexcolor + "0";
                  }
                  contextBg.fillStyle = "#" + hexcolor;
                  contextBg.fillRect(
                    cou - y * width,
                    y,
                    PIXEL_SIZE,
                    PIXEL_SIZE
                  );
                }
              }

              changeCountRef.current = newChangeCount;
            } catch (e) {
              console.log("get line error", e);
            }
          }
        }
        setLoading(false);
        setTimeout(() => {
          loop().then();
        }, 15000);
      }
      await loop();
    })().then();
  }, []);

  const styles = useStyles();
  return (
    <React.Fragment>
      <Box position="relative">
        {loading && (
          <Paper style={{ position: "absolute", zIndex: 1 }} sx={{ width: 1 }}>
            <Skeleton variant="rectangular" height={height} />
            <Skeleton variant="text" height={70} />
          </Paper>
        )}
        <Paper style={{ position: "absolute", zIndex: 0 }} sx={{ width: 1 }}>
          <Box
            style={{ overflow: "hidden" }}
            sx={{ backgroundColor: "#2d2d2d", height: height }}
            position="relative"
            ref={panzoomParentRef}
          >
            <Box position="relative" ref={canvasGroupRef}>
              <canvas
                className={styles.canvas_pen}
                height={height * PIXEL_SIZE}
                width={width * PIXEL_SIZE}
                ref={canvasPenRef}
                onMouseLeave={(e) => {
                  canvasPen
                    .getContext("2d")
                    .clearRect(0, 0, canvasPen.width, canvasPen.height);
                }}
                onTouchMove={onCanvasPenTouch}
                onTouchStart={onCanvasPenTouch}
                onMouseDown={() => setCanvasPenMouseDown(true)}
                onMouseUp={() => setCanvasPenMouseDown(false)}
                onMouseMove={onCanvasPenMouseMove}
              />

              <canvas
                className={styles.canvas_cache}
                height={height * PIXEL_SIZE}
                width={width * PIXEL_SIZE}
                ref={canvasCacheRef}
              />

              <canvas
                className={styles.canvas_bg}
                height={height * PIXEL_SIZE}
                width={width * PIXEL_SIZE}
                ref={canvasBgRef}
              />
            </Box>
          </Box>
          <Box sx={{ display: "flex", m: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <IconButton onClick={() => panzoomRef.current.zoomIn()}>
                <ZoomInIcon />
              </IconButton>

              <IconButton onClick={() => panzoomRef.current.zoomOut()}>
                <ZoomOutIcon />
              </IconButton>
              <IconButton
                disabled={canvasMode === "move"}
                className={styles.disableColorReverseButton}
                onClick={() => switchMode("move")}
              >
                <PanToolIcon />
              </IconButton>
              <IconButton
                disabled={canvasMode === "paint"}
                className={styles.disableColorReverseButton}
                onClick={() => switchMode("paint")}
              >
                <BrushIcon />
              </IconButton>
              <IconButton
                disabled={canvasMode === "eraser"}
                className={styles.disableColorReverseButton}
                onClick={() => switchMode("eraser")}
              >
                <ClearIcon />
              </IconButton>
              {canvasMode === "paint" && (
                <React.Fragment>
                  <IconButton
                    aria-describedby="colorPickerPopover"
                    onClick={(e) => {
                      setColorPickerAnchorEl(e.currentTarget);
                    }}
                  >
                    <ColorLensIcon sx={{ color: brushColor }} />
                  </IconButton>
                  <Popover
                    id="colorPickerPopover"
                    open={Boolean(colorPickerAnchorEl)}
                    anchorEl={colorPickerAnchorEl}
                    onClose={() => setColorPickerAnchorEl(null)}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "center",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "center",
                    }}
                  >
                    <SketchPicker
                      color={brushColor}
                      onChangeComplete={(color) => setBrushColor(color.hex)}
                    />
                  </Popover>
                </React.Fragment>
              )}
            </Box>
            <Button variant="contained" onClick={() => commit().then()}>
              Commit
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarType}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </React.Fragment>
  );
}
