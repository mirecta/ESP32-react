import React, { useEffect } from 'react';
import { withSnackbar, WithSnackbarProps } from 'notistack';
import { redirectingAuthorizedFetch } from '../authentication';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import { access } from 'fs';
import { ENDPOINT_WS } from '../api';

const ACCESS_TOKEN = 'access_token';

export interface RestControllerProps<D> extends WithSnackbarProps {
  handleValueChange: (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxChange: (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  handleSliderChange: (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<{}>, value: number | number[]) => void;
  handleButtonDown: (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => void;

  setData: (data: D) => void;
  saveData: () => void;
  loadData: () => void;
  connectSocket: (onSocketMsg: Function, onSocketOpen?: Function, onSocketClose?: Function) => void;

  data?: D;
  loading: boolean;
  errorMessage?: string;
  online: boolean;
}

interface RestControllerState<D> {
  data?: D;
  loading: boolean;
  errorMessage?: string;
}

export function restController<D, P extends RestControllerProps<D>>(endpointUrl: string, RestController: React.ComponentType<P & RestControllerProps<D>>) {


  return withSnackbar(
    class extends React.Component<Omit<P, keyof RestControllerProps<D>> & WithSnackbarProps, RestControllerState<D>> {

      socket: any = undefined;


      state: RestControllerState<D> = {
        data: undefined,
        loading: false,
        errorMessage: undefined,
      };


      connectSocket = (onSocketMsg: Function, onSocketOpen?: Function, onSocketClose?: Function) => {

        if (!this.socket) {
          const accessToken = localStorage.getItem(ACCESS_TOKEN);
          if (accessToken) {
            this.socket = new W3CWebSocket(ENDPOINT_WS.replace('http://','ws://') + "?Authorization='Bearer " + accessToken + "'");
          }
        }
        if (onSocketOpen) {
          this.socket.onopen = () => {
            onSocketOpen();
          }
        }
        this.socket.onmessage = (message: any) => {
          onSocketMsg(message);
        }
        if (onSocketClose) {
          this.socket.onclose = (err: any) => {
            this.socket = undefined;
            onSocketClose(err);
          }
        }
      }

      setData = (data: D) => {
        this.setState({
          data,
          loading: false,
          errorMessage: undefined
        });
      }

      loadData = () => {
        this.setState({
          data: undefined,
          loading: true,
          errorMessage: undefined
        });
        redirectingAuthorizedFetch(endpointUrl).then(response => {
          if (response.status === 200) {
            return response.json();
          }
          throw Error("Invalid status code: " + response.status);
        }).then(json => {
          this.setState({ data: json, loading: false })
        }).catch(error => {
          const errorMessage = error.message || "Unknown error";
          this.props.enqueueSnackbar("Problem fetching: " + errorMessage, { variant: 'error' });
          this.setState({ data: undefined, loading: false, errorMessage });
        });
      }

      saveData = () => {
        this.setState({ loading: true });
        redirectingAuthorizedFetch(endpointUrl, {
          method: 'POST',
          body: JSON.stringify(this.state.data),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(response => {
          if (response.status === 200) {
            return response.json();
          }
          throw Error("Invalid status code: " + response.status);
        }).then(json => {
          this.props.enqueueSnackbar("Changes successfully applied.", { variant: 'success' });
          this.setState({ data: json, loading: false });
        }).catch(error => {
          const errorMessage = error.message || "Unknown error";
          this.props.enqueueSnackbar("Problem saving: " + errorMessage, { variant: 'error' });
          this.setState({ data: undefined, loading: false, errorMessage });
        });
      }

      handleValueChange = (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (doNow && this.socket) {
          if(this.socket.readyState === 1){
            this.socket.send(name + "|" + new String(event.target.value));
          }
        }
        console.log(doNow);
        const data = { ...this.state.data!, [name]: event.target.value };
        this.setState({ data });
      }

      handleCheckboxChange = (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (doNow && this.socket) {
          if(this.socket.readyState === 1){
            this.socket.send(name + "|" + event.target.checked?'1':'0');
          }
        }
        const data = { ...this.state.data!, [name]: event.target.checked };
        this.setState({ data });
      }

      handleSliderChange = (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<{}>, value: number | number[]) => {

        if (doNow && this.socket) {
          if(this.socket.readyState === 1){
            this.socket.send(name + "|" + new String(value));
          }
        }
        const data = { ...this.state.data!, [name]: value };
        this.setState({ data });
      };

      render() {
        return <RestController
          handleValueChange={this.handleValueChange}
          handleCheckboxChange={this.handleCheckboxChange}
          handleSliderChange={this.handleSliderChange}
          setData={this.setData}
          saveData={this.saveData}
          loadData={this.loadData}
          connectSocket={this.connectSocket}
          {...this.state}
          {...this.props as P}
        />;
      }

    });
}
