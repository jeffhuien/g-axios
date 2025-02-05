import { CacheEnum } from "@/enum";
import router from "@/router";
import { LogOut, store } from "@/utils";
import axios, { AxiosRequestConfig } from "axios";

export default class Axios {
  protected instance;
  constructor(config: AxiosRequestConfig) {
    this.instance = axios.create(config); //初始化axios
    this.interceptors(); //拦截器
  }

  public async request<T, D = APIResponse<T>>(config: AxiosRequestConfig) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.instance.request<D>(config);
        resolve(response.data);
      } catch (error) {
        reject(error);
      }
    }) as Promise<D>;
  }

  private interceptors() {
    this.interceptorsRequest(); //请求拦截器
    this.interceptorsResponse(); //响应拦截器
    // throw new Error("Method not implemented.");
  }

  private interceptorsRequest() {
    // 添加请求拦截器
    this.instance.interceptors.request.use(
      function (config) {
        config.timeout = 10000;
        if (store.get(CacheEnum.TOKEN_NAME)) {
          config.headers["x-token"] = store.get(CacheEnum.TOKEN_NAME);
        }
        // 在发送请求之前做些什么
        return config;
      },
      function (error) {
        // 对请求错误做些什么
        console.log("出错了");

        return Promise.reject(error);
      }
    );
  }

  private interceptorsResponse() {
    // 添加响应拦截器
    this.instance.interceptors.response.use(
      function (response) {
        // 对响应数据做点什么
        if (response.data.code != 0) {
          // 拦截这个页面的请求错误消息
          if (response.config.url?.includes("getSendAddress")) {
            return response;
          }

          if (response.data?.msg) {
            if (router?.currentRoute?.value?.name !== "shipments.auto") {
              if (
                //
                (response.data.msg.includes("授权") && !response.data.msg.includes("续费")) ||
                response.data.msg.includes("token") ||
                response.data.msg.includes("您的帐户异地登陆或令牌失效")
              ) {
                ElMessage.warning("授权可能已经过期，请重新登录");
                setTimeout(() => {
                  LogOut(true).then((r: any) => r());
                }, 2000);
                return response;
              }
            }
            ElMessage.warning(response.data.msg);
          }
        }
        return response;
      },
      function (error) {
        if (error.code === "ECONNABORTED" && error.message.includes("timeout")) {
          ElMessage({
            type: "error",
            message: `服务器请求超时，请稍后重试`,
            duration: 3000,
            showClose: true,
          });
        } else {
          ElMessage.error(error.message);
        }
        // 超出 2xx 范围的状态码都会触发该函数。
        // 对响应错误做点什么
        return Promise.reject(error);
      }
    );
  }
}
