import React, { useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  createTheme,
  CssBaseline,
  Dialog,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  Toolbar,
  Typography,
} from "@mui/material";
import logo from "./logo.svg";
import LinkIcon from "@mui/icons-material/Link";
import global from "./global";
import PropTypes from "prop-types";
import { ethers } from "ethers";
import { useRecoilState } from "recoil";
import { AccountsState } from "./store";
import { Canvas } from "./Canvas";
import { ThemeProvider } from "@mui/material/styles";
import Portis from "@portis/web3";
function WalletConnectDialog(props) {
  const { onError, onClose, open } = props;
  const [, setAccounts] = useRecoilState(AccountsState);
  const handleClose = () => {
    onClose();
  };
  const connectToPortis = async () => {
    try {
      const portis = new Portis(
        "78c17d0b-58d7-4de8-b3df-8e2da9721223",
        "matic"
      );

      const provider = new ethers.providers.Web3Provider(portis.provider);

      setAccounts(await provider.listAccounts());
      global.provider = provider;

      onClose();
    } catch (e) {
      onError(e.message);
    }
  };
  const connectToMetaMask = async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    setAccounts(await provider.listAccounts());
    global.provider = provider;
    onClose();
  };
  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>Select Wallet</DialogTitle>
      <List sx={{ pt: 0, minWidth: 250 }}>
        {window.ethereum !== undefined && (
          <ListItem button onClick={connectToMetaMask}>
            <ListItemAvatar>
              <img
                height="40px"
                width="40px"
                src="https://docs.metamask.io/metamask-fox.svg"
                alt="Meta Mask"
              />
            </ListItemAvatar>
            <ListItemText primary="Meta Mask" />
          </ListItem>
        )}

        <ListItem button onClick={connectToPortis}>
          <ListItemAvatar>
            <img
              height="40px"
              width="40px"
              alt="WalletConnect"
              src="https://dashboard.portis.io/36760a8c1b9ecd732226178ed8b14955.svg"
            />
          </ListItemAvatar>
          <ListItemText primary="Portis" />
        </ListItem>
      </List>
    </Dialog>
  );
}

WalletConnectDialog.propTypes = {
  onError: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

function App() {
  const theme = createTheme({
    palette: { background: { default: "#F1F2F3" } },
  });

  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
  const [errorSackbarMsg, setErrorSnackbarMsg] = useState("");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [accounts] = useRecoilState(AccountsState);

  return (
    <React.Fragment>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar position="relative">
          <Toolbar>
            <Box sx={{ mr: 2 }}>
              <img height="40" width="40" src={logo} alt="logo" />
            </Box>
            <Typography
              variant="h6"
              color="inherit"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              Art on chain
            </Typography>
            <Button
              color="inherit"
              style={{ maxWidth: 200 }}
              onClick={() => setConnectDialogOpen(!connectDialogOpen)}
              endIcon={<LinkIcon />}
            >
              <Typography noWrap>
                {accounts.length === 0 ? "Connect Wallet" : accounts[0]}
              </Typography>
            </Button>
          </Toolbar>
        </AppBar>
        <Container component="main">
          <Toolbar />
          <Canvas />

          <Divider sx={{ mt: 100, mb: 5 }} />
          <Box sx={{ display: "flex", m: 1 }}>
            <img height="60" width="60" src={logo} alt="logo" />
            <Typography variant="h4" sx={{ ml: 1, mt: "auto", mb: "auto" }}>
              Art on chain
            </Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ ml: 1, mt: "auto", mb: "auto" }}>
              Contract Address: {global.canvasContract.address}
            </Typography>
            <Typography variant="h6" sx={{ ml: 1, mt: "auto", mb: "auto" }}>
              Author Email: 1025sxr@gmail.com
            </Typography>
            <Typography variant="h6" sx={{ ml: 1, mt: "auto", mb: "auto" }}>
              Author Address: 0x5712Cc97a9e15A09e2E2903805970BD9819A8dEC
            </Typography>
          </Box>
        </Container>

        <WalletConnectDialog
          onError={(msg) => {
            setErrorSnackbarMsg(msg);
            setErrorSnackbarOpen(true);
          }}
          onClose={() => {
            setConnectDialogOpen(false);
          }}
          open={connectDialogOpen}
        />

        <Snackbar
          open={errorSnackbarOpen}
          autoHideDuration={6000}
          onClose={() => setErrorSnackbarOpen(false)}
        >
          <Alert
            onClose={() => setErrorSnackbarOpen(false)}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {errorSackbarMsg}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </React.Fragment>
  );
}

export default App;
